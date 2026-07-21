// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {DiamondCapsule} from "../src/DiamondCapsule.sol";

// 캡슐 컨트랙트만 재배포 (기존 토큰 재사용).
// 실행:  forge script script/DeployCapsule.s.sol --rpc-url rh_testnet --broadcast
contract DeployCapsule is Script {
    function run() external {
        vm.startBroadcast();
        DiamondCapsule cap = new DiamondCapsule(msg.sender); // feeRecipient = 배포자
        vm.stopBroadcast();
        console.log("DiamondCapsule:", address(cap));
    }
}
