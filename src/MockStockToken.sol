// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// 테스트/연습용 가짜 주식 토큰. 이름·심볼을 지정해 여러 종류를 배포할 수 있다.
// 누구나 faucet()으로 받아서 캡슐에 넣어볼 수 있다.
contract MockStockToken is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function faucet(uint256 amount) external {
        _mint(msg.sender, amount); // 원하는 만큼 무료로 찍어줌 (테스트 전용)
    }
}
