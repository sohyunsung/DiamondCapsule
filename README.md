# 💎 Diamond Capsule

A **time-capsule NFT** dApp for tokenized stocks on **Robinhood Chain** (EVM).

**🌐 Live demo: https://sohyunsung.github.io/DiamondCapsule/** (Robinhood Chain Testnet)

> "A promise to your future self. Lock it, hold it, watch it bloom."

## Concept

- ⏳ **Lock** — Deposit stock tokens into a capsule and set a maturity date. Your tokens become a capsule (NFT) held by the contract. Dividends keep accruing while locked (via the token's multiplier).
- 💎 **Hold** — Break early and you forfeit a 10% penalty. Every time someone breaks early, their penalty is distributed instantly to the holders who stay — proportional to amount × time locked.
- 🌸 **Bloom** — At maturity, withdraw your full principal plus accrued rewards. The capsule NFT (an on-chain SVG that grew from seed to bloom) stays as a keepsake.

## Why blockchain

Tokens are held by the **contract**, not by a company. If this site disappears, the contract lives on-chain and anyone can redeem directly from a block explorer. There are **no admin withdraw, pause, or upgrade powers** — non-custodial by design.

## Fees

- Creating a capsule: **free**
- Redeeming at maturity: **free**
- Only fee: **0.5% of the early-break penalty** goes to the protocol; the other 99.5% goes to holders who stay.
- Optional **"no early exit" hard lock**: pay an ETH fee worth ~$0.50 (price-dynamic) to make a capsule unbreakable before maturity.

## Features

- Multi-token: pick a preset stock token or paste any token address from your wallet
- Per-token reward pools (a token's penalties only reward that token's holders)
- Growing on-chain SVG NFT (seed → sprout → tree → bloom)
- Live stats (participants / capsules / currently locked)
- i18n: English · 한국어 · 中文, with light/dark themes

## Tech stack

| Layer | Tool |
|---|---|
| Language | Solidity |
| Framework | Foundry |
| Libraries | OpenZeppelin (ERC-721, ReentrancyGuard) |
| Frontend | Vite + React + wagmi + viem |
| Hosting | GitHub Pages (static) |

## Security notes

- `ReentrancyGuard` on all state-changing calls
- Balance-diff accounting on deposit (safe against fee-on-transfer tokens)
- Optional token whitelist (off by default on testnet; enable on mainnet for vetted tokens only)

## Structure

```
src/
├── DiamondCapsule.sol   # lock / redeem / break / reward pool / growing NFT
└── MockStockToken.sol   # test stock token with faucet
test/DiamondCapsule.t.sol # 10 tests
web/                      # frontend (Vite + React)
```

## Develop

```bash
forge build && forge test      # contracts
cd web && npm install && npm run dev   # frontend
```

## Status

- [x] Contract logic (lock / redeem / break / per-token reward pool)
- [x] Tests (10/10 passing)
- [x] Testnet deployment ([DEPLOYMENTS.md](./DEPLOYMENTS.md))
- [x] Frontend live on GitHub Pages
- [x] Multi-token, no-break hard lock, stats, i18n (en/ko/zh)
- [ ] Verify real Stock Token transfer/compliance behavior (mainnet blocker)
- [ ] Security audit
- [ ] Legal review (securities)

## Disclaimer

Demo / testnet. Tokenized stocks differ legally from real shares (limited voting/ownership rights), and investing carries risk of loss. Review applicable regulations and risks before any real-money use.
