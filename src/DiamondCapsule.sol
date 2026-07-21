// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelin: 검증된 표준 컨트랙트 모음. 바닥부터 안 짜고 가져다 씀.
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";           // NFT 표준
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";            // 토큰(주식 토큰) 인터페이스
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol"; // 안전한 토큰 전송
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";               // 숫자 -> 문자열
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";                 // 온체인 SVG 인코딩

/**
 * @title DiamondCapsule
 * @notice 주식 토큰을 미래 시점까지 잠그는 "타임캡슐" NFT.
 *  - 만기까지 버티면 그대로 되찾는다 (그 사이 multiplier로 자산 가치는 알아서 불어남).
 *  - 중간에 못 참고 깨면 페널티를 문다 (다이아 핸드).
 *  - 캡슐 하나가 NFT 하나이고, 시간이 지날수록 그림이 자란다 (씨앗 -> 만개).
 */
contract DiamondCapsule is ERC721 {
    using SafeERC20 for IERC20;

    // --- 캡슐 하나가 담는 정보 ---
    struct Capsule {
        address token;      // 잠근 주식 토큰 주소
        uint256 amount;     // 잠근 수량
        uint64  createdAt;  // 만든 시각 (성장 계산 시작점)
        uint64  unlockTime; // 열리는 시각
        string  message;    // 미래의 나에게 남기는 편지
        Status  status;     // 현재 상태
    }

    // 캡슐 상태: 잠김 / 정상 개봉 / 조기 파기
    enum Status { Locked, Redeemed, Broken }

    uint256 public nextId;                 // 다음 캡슐 번호 (0,1,2...)
    mapping(uint256 => Capsule) public capsules; // 번호 -> 캡슐 정보

    uint256 public constant PENALTY_BPS = 1000; // 조기 파기 페널티 10% (10000 = 100%)
    address public immutable penaltyVault;      // 페널티가 쌓이는 곳 (자선/커뮤니티 풀)

    // 이벤트: 무슨 일이 있었는지 체인에 기록 -> 프론트가 이걸 구독해서 UI 갱신
    event Locked(uint256 indexed id, address indexed owner, address token, uint256 amount, uint64 unlockTime);
    event Redeemed(uint256 indexed id, address indexed owner, uint256 amount);
    event Broken(uint256 indexed id, address indexed owner, uint256 returned, uint256 penalty);

    constructor(address _penaltyVault) ERC721("Diamond Capsule", "DCAP") {
        require(_penaltyVault != address(0), "vault=0");
        penaltyVault = _penaltyVault;
    }

    // --- 1) 캡슐 만들기: 토큰을 넣고 잠근다 ---
    function mint(address token, uint256 amount, uint64 unlockTime, string calldata message)
        external
        returns (uint256 id)
    {
        require(amount > 0, "amount=0");
        require(unlockTime > block.timestamp, "unlock must be future");

        // 사용자가 미리 approve 해둔 토큰을 이 컨트랙트로 가져온다.
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        id = nextId++;
        capsules[id] = Capsule({
            token: token,
            amount: amount,
            createdAt: uint64(block.timestamp),
            unlockTime: unlockTime,
            message: message,
            status: Status.Locked
        });

        _safeMint(msg.sender, id); // 캡슐 NFT를 사용자에게 발행
        emit Locked(id, msg.sender, token, amount, unlockTime);
    }

    // --- 2) 만기 개봉: 시간이 다 됐으면 전액 회수 ---
    function redeem(uint256 id) external {
        require(ownerOf(id) == msg.sender, "not owner");
        Capsule storage c = capsules[id];
        require(c.status == Status.Locked, "not locked");
        require(block.timestamp >= c.unlockTime, "still locked");

        uint256 amount = c.amount;
        c.amount = 0;
        c.status = Status.Redeemed; // NFT는 "개봉 완료" 기념품으로 계속 보유

        IERC20(c.token).safeTransfer(msg.sender, amount);
        emit Redeemed(id, msg.sender, amount);
    }

    // --- 3) 조기 파기: 못 참으면 페널티 물고 회수 ---
    function breakEarly(uint256 id) external {
        require(ownerOf(id) == msg.sender, "not owner");
        Capsule storage c = capsules[id];
        require(c.status == Status.Locked, "not locked");
        require(block.timestamp < c.unlockTime, "already unlocked; use redeem");

        uint256 amount = c.amount;
        uint256 penalty = (amount * PENALTY_BPS) / 10000;
        uint256 returned = amount - penalty;

        c.amount = 0;
        c.status = Status.Broken;

        IERC20(c.token).safeTransfer(msg.sender, returned);   // 남은 건 본인에게
        IERC20(c.token).safeTransfer(penaltyVault, penalty);  // 페널티는 풀로
        emit Broken(id, msg.sender, returned, penalty);
    }

    // --- 4) 살아있는 NFT: 시간 경과에 따라 그림이 자란다 ---
    // 0~4단계: 씨앗 -> 새싹 -> 자라는 중 -> 나무 -> 만개
    function growthStage(uint256 id) public view returns (uint8) {
        Capsule storage c = capsules[id];
        if (c.status == Status.Broken) return 255; // 시든 상태(특수값)
        if (block.timestamp >= c.unlockTime) return 4; // 만개
        uint256 total = c.unlockTime - c.createdAt;
        uint256 elapsed = block.timestamp - c.createdAt;
        return uint8((elapsed * 4) / total); // 0,1,2,3
    }

    // NFT 지갑/마켓이 이 함수를 불러서 그림을 보여준다. 서버 없이 온체인에서 생성.
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

    // 단계별 이모지/라벨/배경색
    function _visual(uint8 stage) internal pure returns (string memory, string memory, string memory) {
        if (stage == 255) return (unicode"🥀", "Withered", "#6b7280"); // 조기 파기
        if (stage == 0)   return (unicode"🌱", "Seed",     "#065f46");
        if (stage == 1)   return (unicode"🌿", "Sprout",   "#047857");
        if (stage == 2)   return (unicode"🪴", "Growing",  "#0891b2");
        if (stage == 3)   return (unicode"🌳", "Tree",     "#2563eb");
        return (unicode"🌸", "Bloom", "#7c3aed"); // stage 4: 만개
    }
}
