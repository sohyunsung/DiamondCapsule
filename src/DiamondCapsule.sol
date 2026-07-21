// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title DiamondCapsule (v2)
 * @notice 주식 토큰을 미래 시점까지 잠그는 타임캡슐 NFT.
 *  - 만기까지 버티면 원금 + 보상을 회수한다.
 *  - 중간에 깨면 원금의 10% 페널티. 그 페널티는 (개발자 소액 수수료를 제외하고)
 *    "끝까지 버틴" 다른 홀더들에게 분배된다. 오래·많이 잠글수록 더 받는다.
 *  - 캡슐 하나가 NFT 하나이고, 시간이 지날수록 그림이 자란다.
 *
 * 수수료 (모두 상수, 필요시 조정):
 *  - 생성 수수료 없음 (무료)
 *  - 회수 수수료 없음 (무료)
 *  - 페널티 중 0.5%만 개발자 수익 (DEV_PENALTY_BPS), 나머지는 홀더 보상 풀로
 */
contract DiamondCapsule is ERC721 {
    using SafeERC20 for IERC20;

    struct Capsule {
        address token;      // 잠근 주식 토큰
        uint256 principal;  // 잠긴 원금 (생성 수수료 제외 후)
        uint64  createdAt;
        uint64  unlockTime;
        string  message;    // 미래의 나에게
        uint8   status;     // 0 Locked, 1 Redeemed, 2 Broken
        uint256 rewardDebt; // 보상 회계용 (내부)
    }

    uint256 public nextId;
    mapping(uint256 => Capsule) public capsules;

    uint256 public constant PENALTY_BPS = 1000;    // 조기파기 페널티 10%
    uint256 public constant DEV_PENALTY_BPS = 50;  // 페널티 중 0.5%가 개발자 몫
    uint256 private constant ACC = 1e18;

    address public immutable feeRecipient;         // 개발자 수수료 수취 주소

    // 토큰별 보상 풀 회계 (표준 accRewardPerShare 방식)
    mapping(address => uint256) public totalStaked;       // 활성 캡슐 원금 합 (토큰별)
    mapping(address => uint256) public accRewardPerShare; // 원금 1단위당 누적 보상 ×1e18

    event Locked(uint256 indexed id, address indexed owner, address token, uint256 principal, uint64 unlockTime);
    event Redeemed(uint256 indexed id, address indexed owner, uint256 principal, uint256 reward);
    event Broken(uint256 indexed id, address indexed owner, uint256 returned, uint256 toPool, uint256 devFee);

    constructor(address _feeRecipient) ERC721("Diamond Capsule", "DCAP") {
        require(_feeRecipient != address(0), "fee=0");
        feeRecipient = _feeRecipient;
    }

    // --- 1) 캡슐 만들기 ---
    function mint(address token, uint256 amount, uint64 unlockTime, string calldata message)
        external
        returns (uint256 id)
    {
        require(amount > 0, "amount=0");
        require(unlockTime > block.timestamp, "unlock must be future");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // 생성 수수료 없음: 예치액 전부가 원금
        uint256 principal = amount;

        // 보상 풀 편입
        totalStaked[token] += principal;
        uint256 debt = (principal * accRewardPerShare[token]) / ACC;

        id = nextId++;
        capsules[id] = Capsule({
            token: token, principal: principal, createdAt: uint64(block.timestamp),
            unlockTime: unlockTime, message: message, status: 0, rewardDebt: debt
        });
        _safeMint(msg.sender, id);
        emit Locked(id, msg.sender, token, principal, unlockTime);
    }

    // 현재 캡슐에 쌓인 미청구 보상
    function pendingReward(uint256 id) public view returns (uint256) {
        Capsule storage c = capsules[id];
        if (c.status != 0) return 0;
        return (c.principal * accRewardPerShare[c.token]) / ACC - c.rewardDebt;
    }

    // --- 2) 만기 개봉: 원금 + 보상 회수 (회수 수수료 없음) ---
    function redeem(uint256 id) external {
        require(ownerOf(id) == msg.sender, "not owner");
        Capsule storage c = capsules[id];
        require(c.status == 0, "not locked");
        require(block.timestamp >= c.unlockTime, "still locked");

        address token = c.token;
        uint256 principal = c.principal;
        uint256 reward = pendingReward(id);

        totalStaked[token] -= principal;
        c.status = 1;
        c.rewardDebt = 0;

        IERC20(token).safeTransfer(msg.sender, principal + reward);
        emit Redeemed(id, msg.sender, principal, reward);
    }

    // --- 3) 조기 파기: 페널티 10% (개발자 0.5% + 나머지 홀더 풀) ---
    function breakEarly(uint256 id) external {
        require(ownerOf(id) == msg.sender, "not owner");
        Capsule storage c = capsules[id];
        require(c.status == 0, "not locked");
        require(block.timestamp < c.unlockTime, "already unlocked; use redeem");

        address token = c.token;
        uint256 principal = c.principal;
        uint256 forfeited = pendingReward(id); // 깬 사람은 자기 보상 몰수 -> 남은 사람에게

        uint256 penalty = (principal * PENALTY_BPS) / 10000;
        uint256 devFee = (penalty * DEV_PENALTY_BPS) / 10000;
        uint256 toPool = penalty - devFee + forfeited;
        uint256 returned = principal - penalty;

        // 깬 캡슐을 풀에서 제거
        totalStaked[token] -= principal;
        c.status = 2;
        c.rewardDebt = 0;

        // 남은 홀더들에게 분배 (없으면 개발자에게 흡수)
        uint256 staked = totalStaked[token];
        if (staked > 0) {
            accRewardPerShare[token] += (toPool * ACC) / staked;
        } else {
            devFee += toPool;
        }

        if (devFee > 0) IERC20(token).safeTransfer(feeRecipient, devFee);
        IERC20(token).safeTransfer(msg.sender, returned);
        emit Broken(id, msg.sender, returned, toPool, devFee);
    }

    // --- 4) 살아있는 NFT: 시간 경과에 따라 그림이 자란다 ---
    function growthStage(uint256 id) public view returns (uint8) {
        Capsule storage c = capsules[id];
        if (c.status == 2) return 255; // 시든 상태
        if (block.timestamp >= c.unlockTime) return 4;
        uint256 total = c.unlockTime - c.createdAt;
        uint256 elapsed = block.timestamp - c.createdAt;
        return uint8((elapsed * 4) / total);
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        _requireOwned(id);
        uint8 stage = growthStage(id);
        (string memory emoji, string memory label, string memory color) = _visual(stage);

        string memory svg = string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">',
            '<rect width="400" height="400" fill="', color, '"/>',
            '<text x="200" y="200" font-size="140" text-anchor="middle">', emoji, '</text>',
            '<text x="200" y="320" font-size="28" fill="#fff" text-anchor="middle">', label, '</text>',
            '<text x="200" y="360" font-size="20" fill="#fff" text-anchor="middle">Capsule #',
            Strings.toString(id), '</text>',
            '</svg>'
        );
        string memory json = string.concat(
            '{"name":"Diamond Capsule #', Strings.toString(id),
            '","description":"A time-locked stock capsule. Hold to bloom.",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function _visual(uint8 stage) internal pure returns (string memory, string memory, string memory) {
        if (stage == 255) return (unicode"🥀", "Withered", "#6b7280");
        if (stage == 0)   return (unicode"🌱", "Seed",     "#065f46");
        if (stage == 1)   return (unicode"🌿", "Sprout",   "#047857");
        if (stage == 2)   return (unicode"🪴", "Growing",  "#0891b2");
        if (stage == 3)   return (unicode"🌳", "Tree",     "#2563eb");
        return (unicode"🌸", "Bloom", "#7c3aed");
    }
}
