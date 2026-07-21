// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {DiamondCapsule} from "../src/DiamondCapsule.sol";
import {MockStockToken} from "../src/MockStockToken.sol";

// 테스트넷에 컨트랙트 2개를 배포하는 스크립트.
// 실행:  forge script script/Deploy.s.sol --rpc-url rh_testnet --broadcast
contract Deploy is Script {
    function run() external {
        vm.startBroadcast(); // 여기부터 실제 트랜잭션 전송 시작

        // 1) 연습용 가짜 주식 토큰 배포
        MockStockToken stock = new MockStockToken("Mock TSLA", "mTSLA");

        // 2) 캡슐 컨트랙트 배포. 페널티 풀은 일단 배포자 본인 주소로.
        DiamondCapsule cap = new DiamondCapsule(msg.sender);

        vm.stopBroadcast();

        // 배포된 주소 출력 -> 프론트/익스플로러에서 사용
        console.log("MockStockToken:", address(stock));
        console.log("DiamondCapsule:", address(cap));
    }
}
