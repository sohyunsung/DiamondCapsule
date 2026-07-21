// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {DiamondCapsule} from "../src/DiamondCapsule.sol";
import {MockStockToken} from "../src/MockStockToken.sol";

contract DiamondCapsuleTest is Test {
    DiamondCapsule cap;
    MockStockToken stock;

    address user = address(0xA11CE);   // 가상의 사용자
    address vault = address(0xBEEF);   // 페널티 풀
    uint256 constant AMOUNT = 100e18;  // 주식 토큰 100개

    function setUp() public {
        cap = new DiamondCapsule(vault);
        stock = new MockStockToken();

        // 사용자에게 토큰 주고, 컨트랙트에 사용 승인(approve)
        vm.startPrank(user);
        stock.faucet(AMOUNT);
        stock.approve(address(cap), type(uint256).max);
        vm.stopPrank();
    }

    // 캡슐 생성 -> 만기까지 기다렸다가 -> 전액 회수
    function test_LockAndRedeemAfterUnlock() public {
        uint64 unlock = uint64(block.timestamp + 30 days);

        vm.prank(user);
        uint256 id = cap.mint(address(stock), AMOUNT, unlock, "future me: hold on!");

        // 잠긴 동안엔 토큰이 컨트랙트에 있음
        assertEq(stock.balanceOf(address(cap)), AMOUNT);
        assertEq(cap.ownerOf(id), user);

        // 시간을 만기 이후로 감기
        vm.warp(unlock + 1);

        vm.prank(user);
        cap.redeem(id);

        // 전액 돌려받음
        assertEq(stock.balanceOf(user), AMOUNT);
    }

    // 만기 전에 회수하려 하면 실패해야 함
    function test_CannotRedeemBeforeUnlock() public {
        uint64 unlock = uint64(block.timestamp + 30 days);
        vm.prank(user);
        uint256 id = cap.mint(address(stock), AMOUNT, unlock, "");

        vm.prank(user);
        vm.expectRevert(bytes("still locked"));
        cap.redeem(id);
    }

    // 조기 파기: 10% 페널티 떼이고 나머지 회수, 페널티는 풀로
    function test_BreakEarlyPaysPenalty() public {
        uint64 unlock = uint64(block.timestamp + 30 days);
        vm.prank(user);
        uint256 id = cap.mint(address(stock), AMOUNT, unlock, "");

        vm.prank(user);
        cap.breakEarly(id);

        uint256 penalty = AMOUNT / 10;        // 10%
        assertEq(stock.balanceOf(user), AMOUNT - penalty);
        assertEq(stock.balanceOf(vault), penalty);
    }

    // NFT 그림이 시간에 따라 자라는지 확인
    function test_GrowthStageProgresses() public {
        uint64 start = uint64(block.timestamp);
        uint64 unlock = start + 40 days;
        vm.prank(user);
        uint256 id = cap.mint(address(stock), AMOUNT, unlock, "");

        assertEq(cap.growthStage(id), 0);          // 씨앗
        vm.warp(start + 10 days + 1);
        assertEq(cap.growthStage(id), 1);          // 새싹
        vm.warp(start + 30 days + 1);
        assertEq(cap.growthStage(id), 3);          // 나무
        vm.warp(unlock + 1);
        assertEq(cap.growthStage(id), 4);          // 만개

        // tokenURI가 데이터 URI로 잘 나오는지
        string memory uri = cap.tokenURI(id);
        assertGt(bytes(uri).length, 0);
    }
}
