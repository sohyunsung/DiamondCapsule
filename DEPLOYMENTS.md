# 배포 기록

## Robinhood Chain Testnet (chainId 46630)

### v2 — 보상 풀 (현재)
| 컨트랙트 | 주소 |
|---|---|
| DiamondCapsule (무료 + 하드락 옵션) | `0x1b55A670c4B8E76ABc9dcD4000d7d1557948Bc12` |
| MockStockToken (mTSLA) | `0xc1828aE84319051d8343CDc68a2eda85Dc34E1D2` |

- 생성/회수 무료, 페널티 중 0.5%만 개발자
- '절대 해제 불가'(noBreak) 옵션: ETH 수수료 ≈$0.50(시세 동적), floor=0.00003 ETH, admin `setNoBreakFee`로 조정
- 구 버전: `0x4612..FDe2`(무료 첫판), `0xd4Bd..B286`(생성수수료 0.05%)
| MockStockToken (mAMZN) | `0x737983Af59F0c942ABb55d19E80D6D412f103aD5` |
| MockStockToken (mNVDA) | `0x7C4aF317AC720e2CbE41CC949748Ea8d12Fc9096` |

- 수수료: 생성 0.05%, 회수 무료, 페널티 중 0.5%만 개발자(나머지 홀더 보상 풀)
- 익스플로러: https://explorer.testnet.chain.robinhood.com/address/0xd4Bd39db3b856454549A76F00D61Ca2dBF0aB286

### v1 — 초기 (사용 중단)
| 컨트랙트 | 주소 |
|---|---|
| DiamondCapsule v1 | `0x4896836E997458A2c2cef1F5b041C3a25E28F85B` |
| MockStockToken | `0xa9A835963bbbBb4F6Ef3c518DF71A5302b26596A` |
