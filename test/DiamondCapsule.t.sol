// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DiamondCapsule} from "../src/DiamondCapsule.sol";
import {MockStockToken} from "../src/MockStockToken.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// 전송 시 1% 수수료를 태우는 토큰 (balance-diff 회계 검증용)
contract FeeToken is ERC20 {
    constructor() ERC20("Fee", "FEE") {}
    function faucet(uint256 a) external { _mint(msg.sender, a); }
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 fee = value / 100;
            super._update(from, address(0), fee);      // 1% 소각
            super._update(from, to, value - fee);
        } else {
            super._update(from, to, value);
        }
    }
}

contract DiamondCapsuleTest is Test {
    DiamondCapsule cap;
    MockStockToken stock;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address feeRecipient = address(0xFEE);
    uint256 constant AMOUNT = 10_000e18;

    function setUp() public {
        cap = new DiamondCapsule(feeRecipient);
        stock = new MockStockToken("Mock TSLA", "mTSLA");
        _fund(alice);
        _fund(bob);
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);
    }

    function _fund(address who) internal {
        vm.startPrank(who);
        stock.faucet(AMOUNT);
        stock.approve(address(cap), type(uint256).max);
        vm.stopPrank();
    }

    function _principalOf(uint256 id) internal view returns (uint256 p) {
        (, p, , , , , , ) = cap.capsules(id);
    }

    // 생성 수수료 없음: 예치액 전부가 원금
    function test_NoMintFee() public {
        uint64 unlock = uint64(block.timestamp + 30 days);
        vm.prank(alice);
        uint256 id = cap.mint(address(stock), AMOUNT, unlock, "", false);

        assertEq(stock.balanceOf(feeRecipient), 0, "no mint fee");
        assertEq(_principalOf(id), AMOUNT, "principal = full amount");
        assertEq(stock.balanceOf(address(cap)), AMOUNT, "contract holds full amount");
    }

    // 만기 후 회수: 원금 전액 (회수 수수료 없음)
    function test_RedeemNoFee() public {
        uint64 unlock = uint64(block.timestamp + 30 days);
        vm.prank(alice);
        uint256 id = cap.mint(address(stock), AMOUNT, unlock, "", false);

        vm.warp(unlock + 1);
        vm.prank(alice);
        cap.redeem(id);
        assertEq(stock.balanceOf(alice), AMOUNT, "full principal back");
    }

    // 조기파기: 남은 홀더 없으면 페널티 전액 개발자 흡수
    function test_BreakEarly_DevCut() public {
        uint64 unlock = uint64(block.timestamp + 30 days);
        vm.prank(alice);
        uint256 id = cap.mint(address(stock), AMOUNT, unlock, "", false);

        vm.prank(alice);
        cap.breakEarly(id);

        uint256 penalty = (AMOUNT * 1000) / 10000;
        assertEq(stock.balanceOf(alice), AMOUNT - penalty, "alice keeps 90%");
        assertEq(stock.balanceOf(feeRecipient), penalty, "no holders -> penalty to dev");
    }

    // 핵심: 페널티가 버틴 홀더에게 분배
    function test_PenaltyRewardsHolders() public {
        uint64 unlock = uint64(block.timestamp + 60 days);
        vm.prank(alice);
        uint256 idA = cap.mint(address(stock), AMOUNT, unlock, "", false);
        vm.prank(bob);
        uint256 idB = cap.mint(address(stock), AMOUNT, unlock, "", false);

        uint256 pA = _principalOf(idA);
        uint256 pB = _principalOf(idB);

        vm.prank(bob);
        cap.breakEarly(idB);

        uint256 penaltyB = (pB * 1000) / 10000;
        uint256 toPool = penaltyB - (penaltyB * 50) / 10000;

        assertApproxEqAbs(cap.pendingReward(idA), toPool, 1e12, "alice accrues bob's penalty");

        vm.warp(unlock + 1);
        vm.prank(alice);
        cap.redeem(idA);
        assertApproxEqAbs(stock.balanceOf(alice), pA + toPool, 1e12, "principal + reward");
    }

    // 토큰별 풀 분리
    function test_PerTokenIsolation() public {
        address carol = address(0xCA401);
        MockStockToken amzn = new MockStockToken("Mock AMZN", "mAMZN");
        vm.startPrank(carol);
        stock.faucet(AMOUNT);
        stock.approve(address(cap), type(uint256).max);
        vm.stopPrank();
        vm.startPrank(bob);
        amzn.faucet(AMOUNT);
        amzn.approve(address(cap), type(uint256).max);
        vm.stopPrank();

        uint64 unlock = uint64(block.timestamp + 60 days);
        vm.prank(alice);
        uint256 idA = cap.mint(address(stock), AMOUNT, unlock, "", false);
        vm.prank(bob);
        uint256 idB = cap.mint(address(amzn), AMOUNT, unlock, "", false);
        vm.prank(carol);
        uint256 idC = cap.mint(address(stock), AMOUNT, unlock, "", false);

        vm.prank(carol);
        cap.breakEarly(idC);

        assertGt(cap.pendingReward(idA), 0, "mTSLA holder rewarded");
        assertEq(cap.pendingReward(idB), 0, "mAMZN holder untouched");
        assertEq(cap.accRewardPerShare(address(amzn)), 0, "amzn pool untouched");
    }

    // '절대 해제 불가' 옵션: ETH 수수료 납부, 파기 불가, 만기 회수는 가능
    function test_NoBreak() public {
        uint256 fee = cap.noBreakFeeWei();
        uint64 unlock = uint64(block.timestamp + 30 days);
        vm.prank(alice);
        uint256 id = cap.mint{value: fee}(address(stock), AMOUNT, unlock, "", true);

        assertEq(feeRecipient.balance, fee, "dev received eth fee");

        vm.prank(alice);
        vm.expectRevert(bytes("no-break capsule"));
        cap.breakEarly(id);

        vm.warp(unlock + 1);
        vm.prank(alice);
        cap.redeem(id);
        assertEq(stock.balanceOf(alice), AMOUNT, "redeem works at maturity");
    }

    // '절대 해제 불가' 옵션은 수수료 없으면 거부
    function test_NoBreakRequiresFee() public {
        uint64 unlock = uint64(block.timestamp + 30 days);
        vm.prank(alice);
        vm.expectRevert(bytes("noBreak fee"));
        cap.mint(address(stock), AMOUNT, unlock, "", true);
    }

    // 전송세 토큰: 실제 수령액만 원금으로 인정 (drain 방지)
    function test_FeeOnTransferAccounting() public {
        FeeToken ft = new FeeToken();
        vm.startPrank(alice);
        ft.faucet(AMOUNT);
        ft.approve(address(cap), type(uint256).max);
        vm.stopPrank();

        uint64 unlock = uint64(block.timestamp + 30 days);
        vm.prank(alice);
        uint256 id = cap.mint(address(ft), AMOUNT, unlock, "", false);

        uint256 expected = AMOUNT - AMOUNT / 100; // 1% 전송세 제외 실수령
        assertEq(_principalOf(id), expected, "principal = actually received");
        assertEq(ft.balanceOf(address(cap)), expected, "contract holds received");

        vm.warp(unlock + 1);
        vm.prank(alice);
        cap.redeem(id);
        assertEq(ft.balanceOf(address(cap)), 0, "contract fully emptied, no drain");
    }

    // 화이트리스트: 켜면 허용 토큰만
    function test_Whitelist() public {
        cap.setWhitelistEnabled(true); // 이 테스트 컨트랙트가 admin(배포자)
        uint64 unlock = uint64(block.timestamp + 30 days);

        vm.prank(alice);
        vm.expectRevert(bytes("token not allowed"));
        cap.mint(address(stock), AMOUNT, unlock, "", false);

        cap.setTokenAllowed(address(stock), true);
        vm.prank(alice);
        uint256 id = cap.mint(address(stock), AMOUNT, unlock, "", false);
        assertEq(_principalOf(id), AMOUNT, "allowed token works");
    }

    function test_CannotRedeemBeforeUnlock() public {
        uint64 unlock = uint64(block.timestamp + 30 days);
        vm.prank(alice);
        uint256 id = cap.mint(address(stock), AMOUNT, unlock, "", false);
        vm.prank(alice);
        vm.expectRevert(bytes("still locked"));
        cap.redeem(id);
    }
}
