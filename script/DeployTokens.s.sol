// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MockStockToken} from "../src/MockStockToken.sol";

// 멀티토큰 데모용 추가 모의 주식 토큰 배포.
// 실행:  forge script script/DeployTokens.s.sol --rpc-url rh_testnet --broadcast
contract DeployTokens is Script {
    function run() external {
        vm.startBroadcast();
        MockStockToken amzn = new MockStockToken("Mock AMZN", "mAMZN");
        MockStockToken nvda = new MockStockToken("Mock NVDA", "mNVDA");
        vm.stopBroadcast();

        console.log("mAMZN:", address(amzn));
        console.log("mNVDA:", address(nvda));
    }
}
