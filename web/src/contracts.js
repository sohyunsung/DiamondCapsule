// 배포된 컨트랙트 주소 (Robinhood Chain Testnet, chainId 46630)
// v2: 수수료 + 보상 풀
export const CAPSULE = "0x02Da4A4EF34B189698cD92b4515350Fb884859E3";
export const EXPLORER = "https://explorer.testnet.chain.robinhood.com";

// 캡슐에 넣을 수 있는 (모의) 주식 토큰들
export const TOKENS = [
  { symbol: "mTSLA", address: "0xc1828aE84319051d8343CDc68a2eda85Dc34E1D2" },
  { symbol: "mAMZN", address: "0x737983Af59F0c942ABb55d19E80D6D412f103aD5" },
  { symbol: "mNVDA", address: "0x7C4aF317AC720e2CbE41CC949748Ea8d12Fc9096" },
];

// 기본 토큰(하위호환)
export const STOCK = TOKENS[0].address;

// 토큰 주소 -> 심볼 (모르면 주소 축약)
export function symbolOf(addr) {
  if (!addr) return "";
  const t = TOKENS.find((x) => x.address.toLowerCase() === addr.toLowerCase());
  return t ? t.symbol : addr.slice(0, 6) + "…" + addr.slice(-4);
}
