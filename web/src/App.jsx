import { useEffect, useState, useRef } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain, useReadContract, useReadContracts } from "wagmi";
import { readContract, writeContract, waitForTransactionReceipt } from "wagmi/actions";
import { parseUnits, formatUnits, maxUint256 } from "viem";
import { config, robinhoodTestnet } from "./wagmi";
import { capsuleAbi, erc20Abi } from "./abi";
import { CAPSULE, STOCK, EXPLORER, TOKENS, symbolOf } from "./contracts";

const DUR = [30, 90, 180, 365];

const T = {
  ko: {
    nav_how: "작동 방식", nav_build: "캡슐 만들기", nav_trust: "신뢰",
    connect: "지갑 연결", disconnect: "연결 해제", wrongNet: "네트워크 전환",
    eyebrow: "Robinhood Chain · 온체인 · 비수탁",
    h1a: "미래의 나에게 거는 ", h1b: "약속.",
    lead: "주식 토큰을 캡슐에 잠그세요. 끝까지 버티면 그대로 돌려받고, 그 사이 캡슐은 자라납니다. 중간에 깨면 페널티는 버틴 사람들의 몫이 됩니다.",
    cta1: "캡슐 만들기", cta2: "작동 방식 보기",
    chip1: "관리자 인출 불가", chip2: "컨트랙트가 보관", chip3: "24/7 온체인",
    cc_tag: "예시", cc_mine: "내 캡슐", cc_progress: "개화까지",
    cc_locked: "잠긴 자산", cc_unlock: "개화까지",
    how_k: "작동 방식", how_h: "잠근다 · 버틴다 · 개화한다",
    how_p: "세 단계가 전부입니다. 은행도, 중개인도, 관리자도 없습니다 — 규칙은 컨트랙트에 새겨져 있습니다.",
    s1h: "잠근다", s1p: "주식 토큰을 캡슐에 예치하고 만기를 정합니다. 토큰은 당신의 캡슐(NFT)이 되어 컨트랙트가 보관합니다.",
    s2h: "버틴다", s2p: "시간이 흐르며 캡슐이 자랍니다 — 씨앗에서 만개까지. 누군가 조기파기할 때마다 그 페널티가 그 순간 버티고 있는 당신에게 즉시 분배됩니다. 게다가 잠긴 주식 토큰은 배당까지 자동으로 쌓입니다(multiplier).",
    s3h: "개화한다", s3p: "만기가 되면 원금 전액과 쌓인 보상을 회수합니다. 캡슐 NFT는 기념품으로 남습니다.",
    b_k: "캡슐 만들기", b_h: "얼마를, 얼마나 오래", b_p: "금액과 기간을 정하면 페널티와 보상 조건이 실시간으로 계산됩니다.",
    connectPrompt: "캡슐을 만들려면 먼저 지갑을 연결하세요.",
    balance: "내 잔액", faucet: "테스트 토큰 1,000개 받기",
    asset: "자산 선택", amount: "잠글 금액", dur: "락 기간", msg: "미래의 나에게 (선택)", msgPh: "존버하자!",
    lock: "캡슐 잠그기", day: "일",
    sum_title: "요약", sum_lock: "잠글 금액", sum_unlock: "개화일", sum_penalty: "조기파기 페널티", sum_share: "보상 지분",
    sum_mintfee: "생성 수수료", sum_redeemfee: "회수 수수료", free: "무료", cap_reward: "보상 쌓임",
    w_title: "보상 지분 가중치", w_note_a: "같은 금액이라도 ", w_note_b: "오래 잠글수록", w_note_c: " 페널티 풀에서 받는 몫이 커집니다. 지분 = 금액 × 잠근 기간.",
    warn_a: "만기 전에 깨면 ", warn_b: "10%", warn_c: "를 잃고, 그 페널티는 끝까지 버틴 다른 캡슐 보유자들에게 분배됩니다.",
    myCaps: "내 캡슐", empty: "아직 캡슐이 없어요. 위에서 하나 만들어보세요.",
    locked: "보유 중", redeemed: "개봉 완료", broken: "파기됨",
    toBloom: "개화까지", bloomed: "개화 완료 — 회수 가능", redeem: "회수", breakE: "조기 파기 -10%",
    stSeed: "씨앗", stSprout: "새싹", stGrow: "자라는 중", stTree: "나무", stBloom: "만개", withered: "시든 캡슐",
    breakWarn: "정말 깰까요? 10%를 잃고, 그 페널티는 끝까지 버틴 사람들에게 갑니다.",
    approving: "토큰 승인 중… 지갑에서 확인", minting: "캡슐 생성 중… 지갑에서 확인",
    fauceting: "토큰 받는 중… 지갑에서 확인", breaking: "파기 중… 지갑에서 확인", redeeming: "회수 중… 지갑에서 확인",
    done: "완료! 🎉", needFaucet: "mTSLA 잔액이 부족해요. 먼저 ‘테스트 토큰 받기’를 눌러 충전하세요.",
    t_k: "왜 믿어도 되나", t_h: "당신의 자산은 우리가 만지지 않습니다",
    t_p: "Diamond Capsule은 비수탁 프로토콜입니다. 토큰은 회사가 아니라 공개된 스마트 컨트랙트가 보관합니다.",
    t1h: "관리자 백도어 없음", t1p: "인출·일시정지·업그레이드 권한이 코드에 없습니다. 개발자조차 당신의 캡슐을 열 수 없습니다.",
    t2h: "서비스가 사라져도", t2p: "이 사이트가 없어져도 컨트랙트는 체인에 그대로 남습니다. 익스플로러에서 직접 회수할 수 있습니다.",
    t3h: "전부 검증 가능", t3p: "모든 규칙과 잔액이 온체인에 공개됩니다. 소스 코드도 익스플로러에서 확인할 수 있습니다.",
    c_lbl: "캡슐 컨트랙트 (Testnet)", c_link: "익스플로러에서 보기 →",
    foot: "Robinhood Chain 위의 타임캡슐 스톡 NFT",
    disclaimer: "데모입니다. 토큰화 주식은 실제 주식과 법적 지위가 다르며(의결권·소유권 제한), 투자에는 원금 손실 위험이 있습니다.",
    faq_k: "자세히", faq_h: "작동 원리, 하나씩",
    faq: [
      { q: "잠근 동안에도 배당을 받나요?", a: "네. Robinhood Stock Token은 배당이 토큰 가치(multiplier)로 반영되는 방식이라, 캡슐에 잠겨 있어도 배당은 자동으로 쌓입니다. 토큰 개수는 그대로지만 만기에 꺼낼 때 더 가치 있는 토큰이 됩니다. 컨트랙트가 따로 하는 일 없이 복리로 굴러갑니다." },
      { q: "조기파기 페널티는 어디로 가나요?", a: "누군가 조기파기할 때마다, 그 페널티는 바로 그 순간 잠겨 있는 홀더들에게 즉시 분배되어 쌓입니다(한 번에 몰아주는 게 아니라 사건마다 그때그때). 각자의 몫은 ‘잠근 금액 × 잠근 기간’에 비례해서, 오래·많이 잠글수록 더 받습니다. 이미 만기로 빠져나간 사람이나 나중에 들어온 사람은 그 몫을 받지 않아 공평합니다." },
      { q: "수수료는 어떻게 되나요?", a: "생성 시 0.05%(0.1% 미만)의 소액 수수료만 있고, 회수는 무료입니다. 조기파기 페널티(10%) 중에서는 0.5%만 운영 수수료로 쓰이고, 나머지 99.5%는 전부 끝까지 버틴 홀더들에게 돌아갑니다. 즉 대부분의 페널티는 개발자가 아니라 커뮤니티(버틴 사람들)의 몫입니다." },
      { q: "여러 종류의 주식 토큰을 잠글 수 있나요?", a: "네. 캡슐은 특정 토큰에 묶여 있지 않습니다. 토큰마다 별도의 보상 풀이 관리되어, TSLA 페널티는 TSLA 홀더에게, AMZN 페널티는 AMZN 홀더에게 갑니다." },
      { q: "자산은 누가 보관하나요? 서비스가 사라지면요?", a: "회사가 아니라 스마트 컨트랙트가 보관합니다(비수탁). 인출·정지·업그레이드 권한이 코드에 없어 개발자도 손댈 수 없습니다. 이 사이트가 사라져도 컨트랙트는 체인에 남아, 익스플로러에서 직접 회수할 수 있습니다." },
    ],
  },
  en: {
    nav_how: "How it works", nav_build: "Create", nav_trust: "Trust",
    connect: "Connect Wallet", disconnect: "Disconnect", wrongNet: "Switch network",
    eyebrow: "Robinhood Chain · On-chain · Non-custodial",
    h1a: "A promise to your ", h1b: "future self.",
    lead: "Lock your stock tokens in a capsule. Hold to maturity and get it all back — while the capsule grows. Break early, and your penalty rewards those who held.",
    cta1: "Create a capsule", cta2: "See how it works",
    chip1: "No admin withdrawals", chip2: "Held by the contract", chip3: "24/7 on-chain",
    cc_tag: "Example", cc_mine: "My capsule", cc_progress: "to bloom",
    cc_locked: "Locked", cc_unlock: "To bloom",
    how_k: "How it works", how_h: "Lock · Hold · Bloom",
    how_p: "Three steps, that's all. No bank, no broker, no admin — the rules are carved into the contract.",
    s1h: "Lock", s1p: "Deposit stock tokens and set a maturity date. Your tokens become a capsule (NFT) held by the contract.",
    s2h: "Hold", s2p: "The capsule grows over time — from seed to full bloom. Each time someone breaks early, their penalty is distributed instantly to whoever is holding at that moment — including you. On top of that, the locked stock token keeps earning dividends automatically (multiplier).",
    s3h: "Bloom", s3p: "At maturity, withdraw your full principal plus accrued rewards. The capsule NFT stays as a keepsake.",
    b_k: "Create", b_h: "How much, how long", b_p: "Set the amount and duration — penalty and reward terms compute in real time.",
    connectPrompt: "Connect a wallet to create a capsule.",
    balance: "Your balance", faucet: "Get 1,000 test tokens",
    asset: "Choose asset", amount: "Amount to lock", dur: "Lock period", msg: "To your future self (optional)", msgPh: "Hold the line!",
    lock: "Lock capsule", day: "d",
    sum_title: "Summary", sum_lock: "Amount", sum_unlock: "Bloom date", sum_penalty: "Early-break penalty", sum_share: "Reward share",
    sum_mintfee: "Creation fee", sum_redeemfee: "Redeem fee", free: "Free", cap_reward: "reward accrued",
    w_title: "Reward weight", w_note_a: "Same amount — the ", w_note_b: "longer you lock", w_note_c: ", the bigger your slice of the penalty pool. Share = amount × lock time.",
    warn_a: "Break before maturity and you lose ", warn_b: "10%", warn_c: ", redistributed to holders who stay.",
    myCaps: "My capsules", empty: "No capsules yet. Create one above.",
    locked: "Holding", redeemed: "Redeemed", broken: "Broken",
    toBloom: "to bloom", bloomed: "Bloomed — ready to redeem", redeem: "Redeem", breakE: "Break early -10%",
    stSeed: "Seed", stSprout: "Sprout", stGrow: "Growing", stTree: "Tree", stBloom: "Bloom", withered: "Withered",
    breakWarn: "Break it? You lose 10%, and the penalty goes to holders who stay.",
    approving: "Approving… confirm in wallet", minting: "Creating capsule… confirm in wallet",
    fauceting: "Getting tokens… confirm in wallet", breaking: "Breaking… confirm in wallet", redeeming: "Redeeming… confirm in wallet",
    done: "Done! 🎉", needFaucet: "Not enough mTSLA. Click ‘Get test tokens’ first to top up.",
    t_k: "Why you can trust it", t_h: "We never touch your assets",
    t_p: "Diamond Capsule is a non-custodial protocol. Your tokens are held by a public smart contract, not a company.",
    t1h: "No admin backdoor", t1p: "No withdraw, pause, or upgrade powers exist in the code. Not even the developer can open your capsule.",
    t2h: "Survives the service", t2p: "Even if this site disappears, the contract stays on-chain. You can redeem directly from the explorer.",
    t3h: "Fully verifiable", t3p: "Every rule and balance is public on-chain. The source code is verifiable on the explorer.",
    c_lbl: "Capsule contract (Testnet)", c_link: "View on explorer →",
    foot: "Time-capsule stock NFTs on Robinhood Chain",
    disclaimer: "Demo. Tokenized stocks differ legally from real shares (limited voting/ownership), and investing carries risk of loss.",
    faq_k: "In depth", faq_h: "How it works, one by one",
    faq: [
      { q: "Do I still earn dividends while locked?", a: "Yes. Robinhood Stock Tokens reflect dividends in the token's value (a multiplier), so dividends accrue automatically even while your tokens are locked in a capsule. Your token count stays the same, but each token is worth more at maturity. It compounds without the contract doing anything." },
      { q: "Where does the early-break penalty go?", a: "Every time someone breaks early, their penalty is distributed instantly to whoever is locked at that exact moment — not in one lump later, but per event as it happens. Each holder's share is proportional to ‘amount locked × time locked’, so the longer and larger you lock, the more you get. People who already redeemed and left, or who join later, don't get that slice — which keeps it fair." },
      { q: "What are the fees?", a: "A tiny 0.05% fee on creation (under 0.1%), and redemption is free. Of the 10% early-break penalty, only 0.5% is an operating fee — the other 99.5% goes entirely to holders who stay. So most of the penalty belongs to the community (the holders), not the developer." },
      { q: "Can I lock different kinds of stock tokens?", a: "Yes. A capsule isn't tied to one token. Each token has its own reward pool, so TSLA penalties go to TSLA holders and AMZN penalties go to AMZN holders." },
      { q: "Who custodies the assets? What if the service disappears?", a: "A smart contract holds them, not a company (non-custodial). No withdraw, pause, or upgrade powers exist in the code — not even the developer can touch them. If this site vanishes, the contract stays on-chain and you can redeem directly from the explorer." },
    ],
  },
};

const short = (a) => (a ? a.slice(0, 6) + "…" + a.slice(-4) : "");

async function sendTx(params) {
  const hash = await writeContract(config, params);
  await waitForTransactionReceipt(config, { hash });
  return hash;
}

function useTxRunner(t) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState(false);
  async function run(label, fn) {
    setBusy(true); setErr(false); setStatus(label);
    try { await fn(); setStatus(t.done); }
    catch (e) { setStatus((e?.shortMessage || e?.message || String(e)).slice(0, 140)); setErr(true); }
    finally { setBusy(false); }
  }
  return { busy, status, err, run, setStatus, setErr };
}

export default function App() {
  const [lang, setLang] = useState("ko");
  const [theme, setTheme] = useState(null);
  const t = T[lang];
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const wrongNet = isConnected && chainId !== robinhoodTestnet.id;

  useEffect(() => {
    if (theme) document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const dark = theme ? theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;

  return (
    <>
      <nav>
        <div className="wrap nav-in">
          <div className="logo"><span className="gem">💎</span>Diamond Capsule</div>
          <div className="nav-links">
            <a href="#how">{t.nav_how}</a><a href="#learn">{t.faq_k}</a><a href="#build">{t.nav_build}</a><a href="#trust">{t.nav_trust}</a>
          </div>
          <div className="nav-right">
            <button className="theme-btn" onClick={() => setTheme(dark ? "light" : "dark")}>{dark ? "☀️" : "🌙"}</button>
            <button className="lang" onClick={() => setLang(lang === "ko" ? "en" : "ko")}>{lang === "ko" ? "EN" : "한국어"}</button>
            {!isConnected ? (
              <button className="btn-primary" onClick={() => connect({ connector: connectors[0] })}>{t.connect}</button>
            ) : wrongNet ? (
              <button className="btn-amber" onClick={() => switchChain({ chainId: robinhoodTestnet.id })}>{t.wrongNet}</button>
            ) : (
              <button className="btn-ghost sm" onClick={() => disconnect()}>{short(address)}</button>
            )}
          </div>
        </div>
      </nav>

      <Hero t={t} />

      <section id="how"><div className="wrap">
        <div className="sec-head">
          <div className="kicker">{t.how_k}</div><h2>{t.how_h}</h2><p>{t.how_p}</p>
        </div>
        <div className="steps">
          <div className="step"><div className="n">01</div><div className="icon">🔒</div><h3>{t.s1h}</h3><p>{t.s1p}</p></div>
          <div className="step"><div className="n">02</div><div className="icon">🌱</div><h3>{t.s2h}</h3><p>{t.s2p}</p></div>
          <div className="step"><div className="n">03</div><div className="icon">🌸</div><h3>{t.s3h}</h3><p>{t.s3p}</p></div>
        </div>
      </div></section>

      <section id="learn" className="trust"><div className="wrap">
        <div className="sec-head"><div className="kicker">{t.faq_k}</div><h2>{t.faq_h}</h2></div>
        <div className="faq">
          {t.faq.map((f, i) => (
            <details key={i} open={i === 0}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div></section>

      <section id="build"><div className="wrap">
        <div className="sec-head"><div className="kicker">{t.b_k}</div><h2>{t.b_h}</h2><p>{t.b_p}</p></div>
        {!isConnected ? (
          <div className="empty">{t.connectPrompt}<br /><br />
            <button className="btn-primary" onClick={() => connect({ connector: connectors[0] })}>{t.connect}</button>
          </div>
        ) : wrongNet ? (
          <div className="warn"><b>!</b><span>{t.wrongNet} →</span></div>
        ) : (
          <Builder t={t} lang={lang} address={address} />
        )}
      </div></section>

      {isConnected && !wrongNet && (
        <section style={{ paddingTop: 0 }}><div className="wrap">
          <MyCapsules t={t} address={address} />
        </div></section>
      )}

      <section id="trust" className="trust"><div className="wrap">
        <div className="sec-head"><div className="kicker">{t.t_k}</div><h2>{t.t_h}</h2><p>{t.t_p}</p></div>
        <div className="trust-grid">
          <div className="tcard"><div className="ic">🔑</div><h3>{t.t1h}</h3><p>{t.t1p}</p></div>
          <div className="tcard"><div className="ic">🌐</div><h3>{t.t2h}</h3><p>{t.t2p}</p></div>
          <div className="tcard"><div className="ic">📖</div><h3>{t.t3h}</h3><p>{t.t3p}</p></div>
        </div>
        <div className="contract-bar">
          <span className="lbl">{t.c_lbl}</span>
          <span className="addr">{short(CAPSULE)}</span>
          <a href={`${EXPLORER}/address/${CAPSULE}`} target="_blank" rel="noopener">{t.c_link}</a>
        </div>
      </div></section>

      <footer><div className="wrap">
        <div className="foot">
          <div className="logo"><span className="gem">💎</span>Diamond Capsule</div>
          <span>{t.foot}</span>
        </div>
        <p className="disclaimer">{t.disclaimer}</p>
      </div></footer>
    </>
  );
}

function Hero({ t }) {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();
  return (
    <header className="hero"><div className="wrap hero-grid">
      <div>
        <span className="eyebrow"><span className="dot" />{t.eyebrow}</span>
        <h1>{t.h1a}<span className="g">{t.h1b}</span></h1>
        <p className="lead">{t.lead}</p>
        <div className="cta-row">
          <button className="btn-primary" onClick={() => { document.getElementById("build")?.scrollIntoView({ behavior: "smooth" }); if (!isConnected) connect({ connector: connectors[0] }); }}>{t.cta1}</button>
          <button className="btn-ghost" onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}>{t.cta2}</button>
        </div>
        <div className="trust-chips">
          <span className="chip">🛡️ {t.chip1}</span>
          <span className="chip">🔒 {t.chip2}</span>
          <span className="chip">🕐 {t.chip3}</span>
        </div>
      </div>
      <HeroCard t={t} />
    </div></header>
  );
}

function HeroCard({ t }) {
  const { address, isConnected, chainId } = useAccount();
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const demoUnlock = useRef(Math.floor(Date.now() / 1000) + 128 * 86400 + 4 * 3600 + 12 * 60).current;
  useEffect(() => { const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000); return () => clearInterval(id); }, []);

  const onNet = isConnected && chainId === robinhoodTestnet.id;
  const nextId = useReadContract({ address: CAPSULE, abi: capsuleAbi, functionName: "nextId", query: { enabled: onNet, refetchInterval: 6000 } });
  const count = nextId.data ? Number(nextId.data) : 0;
  const ids = Array.from({ length: count }, (_, i) => i);
  const owners = useReadContracts({
    contracts: ids.map((id) => ({ address: CAPSULE, abi: capsuleAbi, functionName: "ownerOf", args: [BigInt(id)] })),
    query: { enabled: onNet && count > 0 && !!address, refetchInterval: 8000 },
  });
  let newestId = -1;
  if (owners.data && address) {
    for (let i = ids.length - 1; i >= 0; i--) {
      const r = owners.data[i];
      if (r?.status === "success" && String(r.result).toLowerCase() === address.toLowerCase()) { newestId = i; break; }
    }
  }
  const cap = useReadContract({
    address: CAPSULE, abi: capsuleAbi, functionName: "capsules", args: [BigInt(newestId < 0 ? 0 : newestId)],
    query: { enabled: newestId >= 0, refetchInterval: 5000 },
  });

  const C = 2 * Math.PI * 80;

  // 실제 내 최신 캡슐
  if (newestId >= 0 && cap.data) {
    const d = cap.data;
    const get = (i, n) => (Array.isArray(d) ? d[i] : d[n]);
    const amt = Number(formatUnits(get(1, "principal"), 18));
    const createdAt = Number(get(2, "createdAt")), unlock = Number(get(3, "unlockTime"));
    const cstatus = Number(get(5, "status"));
    const sym = symbolOf(get(0, "token"));
    const st = stageOf(cstatus, createdAt, unlock, now, t);
    const remaining = unlock - now;
    const progress = cstatus === 0 ? Math.max(0, Math.min(1, (now - createdAt) / (unlock - createdAt))) : 1;
    const cdText = cstatus === 1 ? t.redeemed : cstatus === 2 ? t.broken : remaining <= 0 ? t.bloomed : fmtCountdown(remaining, t.day);
    return (
      <div className="capsule-card">
        <div className="cc-top"><span className="cc-tag">{t.cc_mine}</span><span className="cc-id mono">#{newestId}</span></div>
        <div className="ring-wrap">
          <svg className="ring" width="180" height="180" viewBox="0 0 180 180">
            <circle className="ring-bg" cx="90" cy="90" r="80" fill="none" strokeWidth="10" />
            <circle className="ring-fg" cx="90" cy="90" r="80" fill="none" strokeWidth="10" strokeDasharray={C.toFixed(1)} strokeDashoffset={(C * (1 - progress)).toFixed(1)} />
          </svg>
          <span className="stage-emoji">{st.emoji}</span>
        </div>
        <div className="stage-label">{st.label}</div>
        <div className="stage-sub">{t.cc_progress} <span className="mono">{Math.round(progress * 100)}%</span></div>
        <div className="cc-stats">
          <div className="cc-stat"><div className="k">{t.cc_locked}</div><div className="v mono">{amt.toLocaleString()} <small>{sym}</small></div></div>
          <div className="cc-stat"><div className="k">{t.cc_unlock}</div><div className="v mono countdown">{cdText}</div></div>
        </div>
      </div>
    );
  }

  // 폴백: 예시 카드 (미연결 / 캡슐 없음)
  const dr = demoUnlock - now;
  const dd = Math.floor(dr / 86400), dh = Math.floor((dr % 86400) / 3600), dm = Math.floor((dr % 3600) / 60);
  return (
    <div className="capsule-card">
      <div className="cc-top"><span className="cc-tag">{t.cc_tag}</span><span className="cc-id mono">#0042</span></div>
      <div className="ring-wrap">
        <svg className="ring" width="180" height="180" viewBox="0 0 180 180">
          <circle className="ring-bg" cx="90" cy="90" r="80" fill="none" strokeWidth="10" />
          <circle className="ring-fg" cx="90" cy="90" r="80" fill="none" strokeWidth="10" strokeDasharray={C.toFixed(1)} strokeDashoffset={(C * (1 - 0.64)).toFixed(1)} />
        </svg>
        <span className="stage-emoji">🌳</span>
      </div>
      <div className="stage-label">{t.stTree}</div>
      <div className="stage-sub">{t.cc_progress} <span className="mono">64%</span></div>
      <div className="cc-stats">
        <div className="cc-stat"><div className="k">{t.cc_locked}</div><div className="v mono">100 <small>mTSLA</small></div></div>
        <div className="cc-stat"><div className="k">{t.cc_unlock}</div><div className="v mono countdown">{dd}d {String(dh).padStart(2, "0")}:{String(dm).padStart(2, "0")}</div></div>
      </div>
    </div>
  );
}

function Builder({ t, lang, address }) {
  const [token, setToken] = useState(TOKENS[0].address);
  const [amount, setAmount] = useState("100");
  const [days, setDays] = useState(90);
  const [message, setMessage] = useState("");
  const { busy, status, err, run, setStatus, setErr } = useTxRunner(t);
  const tok = TOKENS.find((x) => x.address === token) || TOKENS[0];

  const balance = useReadContract({
    address: token, abi: erc20Abi, functionName: "balanceOf", args: [address],
    query: { refetchInterval: 4000 },
  });
  const bal = balance.data ? Number(formatUnits(balance.data, 18)) : 0;
  const amt = Number(amount) || 0;

  async function faucet() {
    await run(t.fauceting, () => sendTx({ address: token, abi: erc20Abi, functionName: "faucet", args: [parseUnits("1000", 18)] }));
    balance.refetch();
  }

  async function createCapsule() {
    const amtWei = parseUnits(amount || "0", 18);
    if (balance.data != null && balance.data < amtWei) {
      setErr(true); setStatus(t.needFaucet); return;
    }
    await run(t.approving, async () => {
      const allowance = await readContract(config, { address: token, abi: erc20Abi, functionName: "allowance", args: [address, CAPSULE] });
      if (allowance < amtWei) {
        await sendTx({ address: token, abi: erc20Abi, functionName: "approve", args: [CAPSULE, maxUint256] });
      }
      setStatus(t.minting);
      const unlock = BigInt(Math.floor(Date.now() / 1000) + days * 86400);
      await sendTx({ address: CAPSULE, abi: capsuleAbi, functionName: "mint", args: [token, amtWei, unlock, message || ""] });
    });
    balance.refetch();
  }

  return (
    <>
      <div className="bal-card" style={{ marginBottom: 24 }}>
        <div><div className="k">{t.balance}</div><div className="v">{bal.toLocaleString()} <small>{tok.symbol}</small></div></div>
        <button className="btn-ghost" disabled={busy} onClick={faucet}>{t.faucet} ({tok.symbol})</button>
      </div>

      <div className="builder-grid">
        <div className="builder">
          <div className="field">
            <label>{t.asset}</label>
            <div className="durs" style={{ gridTemplateColumns: `repeat(${TOKENS.length}, 1fr)` }}>
              {TOKENS.map((tt) => (
                <button key={tt.address} className={"dur" + (token === tt.address ? " active" : "")} onClick={() => setToken(tt.address)}>
                  <div className="d">{tt.symbol}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>{t.amount}</label>
            <div className="amount-in">
              <input value={amount} inputMode="decimal" onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
              <span className="tk"><span className="badge">{tok.symbol.replace("m", "")[0]}</span>{tok.symbol}</span>
            </div>
          </div>
          <div className="field">
            <label>{t.dur}</label>
            <div className="durs">
              {DUR.map((dd) => (
                <button key={dd} className={"dur" + (days === dd ? " active" : "")} onClick={() => setDays(dd)}>
                  <div className="d">{dd}{t.day}</div><div className="s">{Math.round(dd / 30)}×</div>
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>{t.msg}</label>
            <div className="amount-in text"><input value={message} placeholder={t.msgPh} onChange={(e) => setMessage(e.target.value)} /></div>
          </div>
          <button className="btn-primary" disabled={busy || !(amt > 0)} onClick={createCapsule}>{t.lock}</button>
          {status && <div className={"status-line" + (err ? " err" : "")}>{status}</div>}
        </div>

        <div className="summary">
          <div className="sum-card">
            <h4>{t.sum_title}</h4>
            <div className="sum-row"><span className="lbl">{t.sum_lock}</span><span className="val">{amt.toLocaleString()} {tok.symbol}</span></div>
            <div className="sum-row"><span className="lbl">{t.sum_unlock}</span><span className="val">+{days}{t.day}</span></div>
            <div className="sum-row"><span className="lbl">{t.sum_mintfee}</span><span className="val">0.05%</span></div>
            <div className="sum-row"><span className="lbl">{t.sum_redeemfee}</span><span className="val" style={{ color: "var(--rh-deep)" }}>{t.free}</span></div>
            <div className="sum-row"><span className="lbl">{t.sum_penalty}</span><span className="val" style={{ color: "var(--amber)" }}>10%</span></div>
            <div className="sum-row"><span className="lbl">{t.sum_share}</span><span className="val" style={{ color: "var(--rh-deep)" }}>{amt.toLocaleString()} × {days}{t.day}</span></div>
          </div>
          <div className="sum-card">
            <h4>{t.w_title}</h4>
            <div className="weight-bars">
              {DUR.map((dd) => (
                <div key={dd} className={"wbar" + (days === dd ? " active" : "")} onClick={() => setDays(dd)}>
                  <div className="fill" style={{ height: Math.max((dd / 365) * 100, 8) + "%" }} />
                  <div className="mult">{Math.round(dd / 30)}×</div>
                  <div className="dlab">{dd}{t.day}</div>
                </div>
              ))}
            </div>
            <p className="note">{t.w_note_a}<b>{t.w_note_b}</b>{t.w_note_c}</p>
          </div>
          <div className="warn"><b>!</b><span>{t.warn_a}<b>{t.warn_b}</b>{t.warn_c}</span></div>
        </div>
      </div>
    </>
  );
}

function MyCapsules({ t, address }) {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const { busy, status, err, run } = useTxRunner(t);
  useEffect(() => { const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000); return () => clearInterval(id); }, []);

  const nextId = useReadContract({ address: CAPSULE, abi: capsuleAbi, functionName: "nextId", query: { refetchInterval: 4000 } });
  const count = nextId.data ? Number(nextId.data) : 0;
  const ids = Array.from({ length: count }, (_, i) => count - 1 - i);

  return (
    <>
      <div className="sec-head" style={{ marginBottom: 20 }}><h2 style={{ fontSize: 24 }}>{t.myCaps}</h2></div>
      {status && <div className={"status-line" + (err ? " err" : "")} style={{ marginBottom: 12 }}>{status}</div>}
      <div className="stack">
        {count === 0 && <div className="empty">{t.empty}</div>}
        {ids.map((id) => <CapsuleCard key={id} id={id} address={address} now={now} t={t} busy={busy} run={run} />)}
      </div>
    </>
  );
}

function stageOf(status, createdAt, unlockTime, now, t) {
  if (status === 2) return { emoji: "🥀", label: t.withered };
  if (status === 1) return { emoji: "🌸", label: t.stBloom };
  const unlock = Number(unlockTime), created = Number(createdAt);
  if (now >= unlock) return { emoji: "🌸", label: t.stBloom };
  const p = Math.max(0, Math.min(1, (now - created) / (unlock - created)));
  const idx = Math.min(3, Math.floor(p * 4));
  return [
    { emoji: "🌱", label: t.stSeed }, { emoji: "🌿", label: t.stSprout },
    { emoji: "🪴", label: t.stGrow }, { emoji: "🌳", label: t.stTree },
  ][idx];
}

function fmtCountdown(secs, dayLabel) {
  if (secs <= 0) return "0";
  const d = Math.floor(secs / 86400), h = Math.floor((secs % 86400) / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  return `${d}${dayLabel} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function CapsuleCard({ id, address, now, t, busy, run }) {
  const owner = useReadContract({ address: CAPSULE, abi: capsuleAbi, functionName: "ownerOf", args: [BigInt(id)] });
  const cap = useReadContract({ address: CAPSULE, abi: capsuleAbi, functionName: "capsules", args: [BigInt(id)], query: { refetchInterval: 5000 } });
  const reward = useReadContract({ address: CAPSULE, abi: capsuleAbi, functionName: "pendingReward", args: [BigInt(id)], query: { refetchInterval: 5000 } });

  const isMine = owner.data && address && owner.data.toLowerCase() === address.toLowerCase();
  if (!isMine || !cap.data) return null;

  const d = cap.data;
  const get = (i, name) => (Array.isArray(d) ? d[i] : d[name]);
  const tokenAddr = get(0, "token"), amtRaw = get(1, "principal"), createdAt = get(2, "createdAt"), unlockTime = get(3, "unlockTime");
  const message = get(4, "message"), cstatus = Number(get(5, "status"));
  const sym = symbolOf(tokenAddr);

  const amt = Number(formatUnits(amtRaw, 18));
  const unlock = Number(unlockTime);
  const remaining = unlock - now;
  const bloomed = remaining <= 0;
  const st = stageOf(cstatus, createdAt, unlockTime, now, t);
  const pill = cstatus === 1 ? ["redeemed", t.redeemed] : cstatus === 2 ? ["broken", t.broken] : ["locked", t.locked];
  const rewardAmt = reward.data ? Number(formatUnits(reward.data, 18)) : 0;

  async function doBreak() {
    if (!window.confirm(t.breakWarn)) return;
    await run(t.breaking, () => sendTx({ address: CAPSULE, abi: capsuleAbi, functionName: "breakEarly", args: [BigInt(id)] }));
    cap.refetch();
  }
  async function doRedeem() {
    await run(t.redeeming, () => sendTx({ address: CAPSULE, abi: capsuleAbi, functionName: "redeem", args: [BigInt(id)] }));
    cap.refetch();
  }

  return (
    <div className="cap">
      <div className="emoji">{st.emoji}</div>
      <div className="cbody">
        <div className="ctop">
          <span className="amt">{amt.toLocaleString()} {sym}</span>
          <span className={"pill " + pill[0]}>{pill[1]}</span>
          {cstatus === 0 && rewardAmt > 0 && (
            <span className="pill locked">＋{rewardAmt.toLocaleString(undefined, { maximumFractionDigits: 4 })} {t.cap_reward}</span>
          )}
          <span className="mono" style={{ color: "var(--muted)", fontSize: 13 }}>#{id}</span>
        </div>
        <div className="cmeta">
          {cstatus === 0 ? (bloomed ? `🌸 ${t.bloomed}` : `${st.label} · ${t.toBloom} ${fmtCountdown(remaining, t.day)}`) : st.label}
          {message ? ` · “${message}”` : ""}
        </div>
      </div>
      {cstatus === 0 && (
        <div>
          {bloomed
            ? <button className="btn-primary sm" disabled={busy} onClick={doRedeem}>{t.redeem}</button>
            : <button className="btn-amber" disabled={busy} onClick={doBreak}>{t.breakE}</button>}
        </div>
      )}
    </div>
  );
}
