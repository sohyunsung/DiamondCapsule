import { parseAbi } from "viem";

// DiamondCapsule 컨트랙트에서 우리가 쓸 함수들 (사람이 읽을 수 있는 형태)
export const capsuleAbi = parseAbi([
  "function mint(address token, uint256 amount, uint64 unlockTime, string message) returns (uint256)",
  "function breakEarly(uint256 id)",
  "function redeem(uint256 id)",
  "function nextId() view returns (uint256)",
  "function ownerOf(uint256 id) view returns (address)",
  "function capsules(uint256 id) view returns (address token, uint256 amount, uint64 createdAt, uint64 unlockTime, string message, uint8 status)",
]);

// MockStockToken (ERC20)
export const erc20Abi = parseAbi([
  "function faucet(uint256 amount)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  // OpenZeppelin 커스텀 에러 — viem이 revert 사유를 사람이 읽게 디코딩하도록
  "error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)",
  "error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)",
]);
