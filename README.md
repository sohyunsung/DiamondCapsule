# 💎 Diamond Capsule

주식 토큰을 미래 시점까지 잠그는 **타임캡슐 NFT** dApp. (Robinhood Chain, EVM)

**🌐 라이브 데모: https://sohyunsung.github.io/DiamondCapsule/** (Robinhood Chain Testnet)

> "미래의 나에게 락을 걸고, 중간에 못 깨게 서약하고, 그 여정이 NFT로 살아 움직인다."

## 컨셉

- ⏳ **타임캡슐** — 주식 토큰을 예치하고 만기까지 잠근다. 그 사이 배당은 multiplier로 알아서 복리.
- 💎 **다이아 핸드** — 만기 전에 깨면 페널티(10%)를 문다. 버티면 전액 회수.
- 🌱 **살아있는 NFT** — 캡슐 하나가 NFT 하나. 시간이 지날수록 그림이 자란다 (씨앗 → 새싹 → 나무 → 만개). 서버 없이 온체인에서 SVG 생성.

## 왜 블록체인인가

토큰은 **컨트랙트가** 보관한다. 서비스(웹사이트/회사)가 사라져도 컨트랙트는 체인 위에 그대로 남아 사용자가 직접 `redeem()`을 호출해 회수할 수 있다. 관리자 인출·일시정지·업그레이드 권한이 **없는** 비수탁(non-custodial) 설계.

## 기술 스택

| 영역 | 툴 |
|---|---|
| 언어 | Solidity |
| 프레임워크 | Foundry |
| 라이브러리 | OpenZeppelin (ERC-721) |
| 프론트엔드(예정) | Next.js + wagmi + viem + RainbowKit |

## 구조

```
src/
├── DiamondCapsule.sol   # 메인: 락 + 페널티 + 성장 NFT
└── MockStockToken.sol   # 테스트용 가짜 주식 토큰
test/
└── DiamondCapsule.t.sol # 테스트
```

## 개발

```bash
forge build        # 컴파일
forge test -vv     # 테스트
```

## 상태

- [x] 컨트랙트 로직 (락 / 개봉 / 조기파기 / 성장 NFT)
- [x] 테스트 (4/4 통과)
- [x] 테스트넷 배포 ([DEPLOYMENTS.md](./DEPLOYMENTS.md))
- [ ] 프론트엔드
- [ ] 보상 풀 v2 (조기파기 페널티 → 다이아 핸드에게 재분배 + 개발자 수수료)
- [ ] 가격 오라클 연동 (손익 기반 NFT 색 변화)
