// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DiamondCapsule} from "../src/DiamondCapsule.sol";
import {MockStockToken} from "../src/MockStockToken.sol";

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
    }

    function _fund(address who) internal {
        vm.startPrank(who);
        stock.faucet(AMOUNT);
        stock.approve(address(cap), type(uint256).max);
        vm.stopPrank();
    }

    function _principalOf(uint256 id) internal view returns (uint256 p) {
        (, p, , , , , ) = cap.capsules(id);
    }

    // 생성 수수료 0.05%가 feeRecipient에게 가고, 나머지가 원금으로 잠긴다
    function test_MintFee() public {
        uint64 unlock = uint64(block.timestamp + 30 days);
        vm.prank(alice);
        uint256 id = cap.mint(address(stock), AMOUNT, unlock, "");

        uint256 fee = (AMOUNT * 5) / 10000; // 0.05%
        assertEq(stock.balanceOf(feeRecipient), fee, "fee to dev");
        assertEq(_principalOf(id), AMOUNT - fee, "principal = amount - fee");
        assertEq(stock.balanceOf(address(cap)), AMOUNT - fee, "contract holds principal");
    }

    // 만기 후 회수: 원금 전액 회수 (회수 수수료 없음), 보상 없으면 정확히 원금
    function test_RedeemNoFee() public {
        uint64 unlock = uint64(block.timestamp + 30 days);
        vm.prank(alice);
        uint256 id = cap.mint(address(stock), AMOUNT, unlock, "");
        uint256 principal = _principalOf(id);

        vm.warp(unlock + 1);
        vm.prank(alice);
        cap.redeem(id);

        assertEq(stock.balanceOf(alice), principal, "alice gets full principal, no redeem fee");
    }

    // 조기파기: 페널티 중 0.5%만 개발자, 나머지는 (남은 홀더 없으면) 함께 개발자로 흡수
    function test_BreakEarly_DevCut() public {
        uint64 unlock = uint64(block.timestamp + 30 days);
        vm.prank(alice);
        uint256 id = cap.mint(address(stock), AMOUNT, unlock, "");
        uint256 principal = _principalOf(id);

        vm.prank(alice);
        cap.breakEarly(id);

        uint256 penalty = (principal * 1000) / 10000; // 10%
        assertEq(stock.balanceOf(alice), principal - penalty, "alice keeps 90%");
        // 남은 홀더가 없으므로 페널티 전액이 feeRecipient로 (mint fee + penalty)
        uint256 mintFee = (AMOUNT * 5) / 10000;
        assertEq(stock.balanceOf(feeRecipient), mintFee + penalty, "no holders -> penalty absorbed by dev");
    }

    // 핵심: 조기파기 페널티가 "버틴 홀더"에게 분배된다
    function test_PenaltyRewardsHolders() public {
        uint64 unlock = uint64(block.timestamp + 60 days);

        vm.prank(alice);
        uint256 idA = cap.mint(address(stock), AMOUNT, unlock, "");
        vm.prank(bob);
        uint256 idB = cap.mint(address(stock), AMOUNT, unlock, "");

        uint256 pA = _principalOf(idA);
        uint256 pB = _principalOf(idB);

        // Bob이 조기파기 -> 그의 페널티(개발자 0.5% 제외)가 Alice에게 쌓여야 함
        vm.prank(bob);
        cap.breakEarly(idB);

        uint256 penaltyB = (pB * 1000) / 10000;
        uint256 devFeeB = (penaltyB * 50) / 10000;
        uint256 toPool = penaltyB - devFeeB;

        uint256 pending = cap.pendingReward(idA);
        assertApproxEqAbs(pending, toPool, 1e12, "alice accrues bob's penalty");

        // Alice 만기 회수 -> 원금 + 보상
        vm.warp(unlock + 1);
        vm.prank(alice);
        cap.redeem(idA);
        assertApproxEqAbs(stock.balanceOf(alice), pA + toPool, 1e12, "alice gets principal + reward");
    }

    // 핵심: 토큰별 풀 분리 — mTSLA 페널티는 mAMZN 홀더에게 절대 가지 않는다
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
        uint256 idA = cap.mint(address(stock), AMOUNT, unlock, ""); // mTSLA (버팀)
        vm.prank(bob);
        uint256 idB = cap.mint(address(amzn), AMOUNT, unlock, "");  // mAMZN (버팀)
        vm.prank(carol);
        uint256 idC = cap.mint(address(stock), AMOUNT, unlock, ""); // mTSLA (파기)

        vm.prank(carol);
        cap.breakEarly(idC);

        assertGt(cap.pendingReward(idA), 0, "mTSLA holder gets reward");
        assertEq(cap.pendingReward(idB), 0, "mAMZN holder untouched");
        assertEq(cap.accRewardPerShare(address(amzn)), 0, "amzn pool untouched");
    }

    function test_CannotRedeemBeforeUnlock() public {
        uint64 unlock = uint64(block.timestamp + 30 days);
        vm.prank(alice);
        uint256 id = cap.mint(address(stock), AMOUNT, unlock, "");
        vm.prank(alice);
        vm.expectRevert(bytes("still locked"));
        cap.redeem(id);
    }
}
