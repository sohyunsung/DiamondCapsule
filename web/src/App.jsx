import { useEffect, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useReadContract,
} from "wagmi";
import { readContract, writeContract, waitForTransactionReceipt } from "wagmi/actions";
import { parseUnits, formatUnits, maxUint256 } from "viem";
import { config, robinhoodTestnet } from "./wagmi";
import { capsuleAbi, erc20Abi } from "./abi";
import { CAPSULE, STOCK, EXPLORER } from "./contracts";

const DUR = [30, 90, 180, 365];

const T = {
  ko: {
    connect: "지갑 연결", disconnect: "연결 해제", wrongNet: "네트워크 전환",
    eyebrow: "Robinhood Chain · 온체인 · 비수탁",
    h1a: "미래의 나에게 거는 ", h1b: "약속.",
    lead: "주식 토큰을 캡슐에 잠그세요. 끝까지 버티면 그대로, 중간에 깨면 페널티는 버틴 사람들 몫.",
    connectPrompt: "시작하려면 지갑을 연결하세요 (MetaMask).",
    balance: "내 mTSLA 잔액", faucet: "테스트 토큰 1,000개 받기",
    create: "캡슐 만들기", amount: "잠글 금액", dur: "락 기간", msg: "미래의 나에게 (선택)",
    msgPh: "존버하자!", lock: "캡슐 잠그기", day: "일",
    myCaps: "내 캡슐", empty: "아직 캡슐이 없어요. 위에서 하나 만들어보세요.",
    locked: "보유 중", redeemed: "개봉 완료", broken: "파기됨",
    toBloom: "개화까지", bloomed: "개화 완료 — 회수 가능", redeem: "회수하기",
    breakE: "조기 파기 (-10%)", withered: "시든 캡슐",
    stSeed: "씨앗", stSprout: "새싹", stGrow: "자라는 중", stTree: "나무", stBloom: "만개",
    breakWarn: "정말 깰까요? 10%를 잃고, 그 페널티는 끝까지 버틴 사람들에게 갑니다.",
    approving: "토큰 승인 중… 지갑에서 확인하세요", minting: "캡슐 생성 중… 지갑에서 확인하세요",
    fauceting: "토큰 받는 중… 지갑에서 확인하세요", breaking: "파기 중… 지갑에서 확인하세요",
    redeeming: "회수 중… 지갑에서 확인하세요", done: "완료! 🎉", contract: "컨트랙트 (Testnet)",
  },
  en: {
    connect: "Connect Wallet", disconnect: "Disconnect", wrongNet: "Switch network",
    eyebrow: "Robinhood Chain · On-chain · Non-custodial",
    h1a: "A promise to your ", h1b: "future self.",
    lead: "Lock your stock tokens. Hold to maturity to get it all back; break early and your penalty rewards the holders.",
    connectPrompt: "Connect a wallet to start (MetaMask).",
    balance: "Your mTSLA balance", faucet: "Get 1,000 test tokens",
    create: "Create a capsule", amount: "Amount to lock", dur: "Lock period", msg: "To your future self (optional)",
    msgPh: "Hold the line!", lock: "Lock capsule", day: "d",
    myCaps: "My capsules", empty: "No capsules yet. Create one above.",
    locked: "Holding", redeemed: "Redeemed", broken: "Broken",
    toBloom: "to bloom", bloomed: "Bloomed — ready to redeem", redeem: "Redeem",
    breakE: "Break early (-10%)", withered: "Withered",
    stSeed: "Seed", stSprout: "Sprout", stGrow: "Growing", stTree: "Tree", stBloom: "Bloom",
    breakWarn: "Break it? You lose 10%, and the penalty goes to holders who stay.",
    approving: "Approving token… confirm in wallet", minting: "Creating capsule… confirm in wallet",
    fauceting: "Getting tokens… confirm in wallet", breaking: "Breaking… confirm in wallet",
    redeeming: "Redeeming… confirm in wallet", done: "Done! 🎉", contract: "Contract (Testnet)",
  },
};

async function sendTx(params) {
  const hash = await writeContract(config, params);
  await waitForTransactionReceipt(config, { hash });
  return hash;
}

export default function App() {
  const [lang, setLang] = useState("ko");
  const t = T[lang];
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const wrongNet = isConnected && chainId !== robinhoodTestnet.id;

  const short = (a) => (a ? a.slice(0, 6) + "…" + a.slice(-4) : "");

  return (
    <>
      <nav>
        <div className="wrap nav-in">
          <div className="logo"><span className="gem">💎</span>Diamond Capsule</div>
          <div className="nav-right">
            <button className="lang" onClick={() => setLang(lang === "ko" ? "en" : "ko")}>
              {lang === "ko" ? "EN" : "한국어"}
            </button>
            {!isConnected ? (
              <button className="btn" onClick={() => connect({ connector: connectors[0] })}>
                {t.connect}
              </button>
            ) : wrongNet ? (
              <button className="btn amber" onClick={() => switchChain({ chainId: robinhoodTestnet.id })}>
                {t.wrongNet}
              </button>
            ) : (
              <button className="btn ghost sm" onClick={() => disconnect()}>
                {short(address)} · {t.disconnect}
              </button>
            )}
          </div>
        </div>
      </nav>

      <header className="hero wrap">
        <span className="eyebrow"><span className="dot" />{t.eyebrow}</span>
        <h1>{t.h1a}<span className="g">{t.h1b}</span></h1>
        <p>{t.lead}</p>
      </header>

      <main className="wrap stack" style={{ paddingBottom: 30 }}>
        {!isConnected ? (
          <div className="empty">{t.connectPrompt}</div>
        ) : wrongNet ? (
          <div className="warn-box">
            {lang === "ko"
              ? "지갑이 다른 네트워크에 있어요. 상단 '네트워크 전환'을 눌러 Robinhood 테스트넷으로 바꿔주세요."
              : "Your wallet is on another network. Click 'Switch network' above to move to the Robinhood testnet."}
          </div>
        ) : (
          <Dashboard t={t} lang={lang} address={address} />
        )}
      </main>

      <footer className="wrap">
        <div>💎 Diamond Capsule · {t.contract}:{" "}
          <a href={`${EXPLORER}/address/${CAPSULE}`} target="_blank" rel="noopener">{short(CAPSULE)} ↗</a>
        </div>
      </footer>
    </>
  );
}

function Dashboard({ t, lang, address }) {
  const [amount, setAmount] = useState("100");
  const [days, setDays] = useState(90);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState(false);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const balance = useReadContract({
    address: STOCK, abi: erc20Abi, functionName: "balanceOf", args: [address],
    query: { refetchInterval: 4000 },
  });
  const nextId = useReadContract({
    address: CAPSULE, abi: capsuleAbi, functionName: "nextId",
    query: { refetchInterval: 4000 },
  });

  const bal = balance.data ? Number(formatUnits(balance.data, 18)) : 0;
  const count = nextId.data ? Number(nextId.data) : 0;

  function say(msg, isErr = false) { setStatus(msg); setErr(isErr); }

  async function run(label, fn) {
    setBusy(true); say(label);
    try {
      await fn();
      say(t.done);
      balance.refetch(); nextId.refetch();
    } catch (e) {
      say((e?.shortMessage || e?.message || String(e)).slice(0, 120), true);
    } finally {
      setBusy(false);
    }
  }

  async function faucet() {
    await run(t.fauceting, () =>
      sendTx({ address: STOCK, abi: erc20Abi, functionName: "faucet", args: [parseUnits("1000", 18)] })
    );
  }

  async function createCapsule() {
    const amt = parseUnits(amount || "0", 18);
    await run(t.approving, async () => {
      const allowance = await readContract(config, {
        address: STOCK, abi: erc20Abi, functionName: "allowance", args: [address, CAPSULE],
      });
      if (allowance < amt) {
        await sendTx({ address: STOCK, abi: erc20Abi, functionName: "approve", args: [CAPSULE, maxUint256] });
      }
      say(t.minting);
      const unlock = BigInt(Math.floor(Date.now() / 1000) + days * 86400);
      await sendTx({
        address: CAPSULE, abi: capsuleAbi, functionName: "mint",
        args: [STOCK, amt, unlock, message || ""],
      });
    });
  }

  const ids = Array.from({ length: count }, (_, i) => count - 1 - i); // 최신순

  return (
    <>
      <section className="card">
        <div className="kv" style={{ padding: 0, alignItems: "center" }}>
          <div>
            <div className="muted small">{t.balance}</div>
            <div className="mono" style={{ fontSize: 26, fontWeight: 700 }}>
              {bal.toLocaleString()} <span className="muted" style={{ fontSize: 15 }}>mTSLA</span>
            </div>
          </div>
          <button className="btn ghost" disabled={busy} onClick={faucet}>{t.faucet}</button>
        </div>
      </section>

      <section className="card">
        <h3>{t.create}</h3>
        <div className="field">
          <label>{t.amount}</label>
          <div className="amount-in">
            <input value={amount} inputMode="decimal"
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
            <span className="tk"><span className="badge">T</span>mTSLA</span>
          </div>
        </div>
        <div className="field">
          <label>{t.dur}</label>
          <div className="durs">
            {DUR.map((d) => (
              <button key={d} className={"dur" + (days === d ? " active" : "")} onClick={() => setDays(d)}>
                <div className="d">{d}{t.day}</div>
                <div className="s">{Math.round(d / 30)}×</div>
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>{t.msg}</label>
          <div className="amount-in">
            <input value={message} placeholder={t.msgPh} style={{ fontFamily: "var(--sans)", fontSize: 15 }}
              onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>
        <button className="btn" style={{ width: "100%", padding: 14 }} disabled={busy || !(Number(amount) > 0)}
          onClick={createCapsule}>{t.lock}</button>
        {status && <div className={"status-line" + (err ? " err" : "")} style={{ marginTop: 12 }}>{status}</div>}
      </section>

      <section className="block">
        <h3 style={{ marginBottom: 14 }}>{t.myCaps}</h3>
        <div className="stack" style={{ gap: 10 }}>
          {ids.map((id) => (
            <CapsuleCard key={id} id={id} address={address} now={now} t={t} busy={busy} run={run} />
          ))}
          <EmptyIfNone ids={ids} address={address} t={t} />
        </div>
      </section>
    </>
  );
}

// 소유 여부는 각 카드가 판단하므로, 전부 남이 소유면 목록이 비어보인다 -> 안내 표시
function EmptyIfNone({ ids, address, t }) {
  // 간단히: 캡슐이 하나도 없을 때만 안내 (소유 필터는 각 카드에서)
  if (ids.length > 0) return null;
  return <div className="empty">{t.empty}</div>;
}

function statusPill(s, t) {
  if (s === 1) return ["redeemed", t.redeemed];
  if (s === 2) return ["broken", t.broken];
  return ["locked", t.locked];
}

function stageOf(cap, now, t) {
  if (cap.status === 2) return { emoji: "🥀", label: t.withered };
  if (cap.status === 1) return { emoji: "🌸", label: t.stBloom };
  const unlock = Number(cap.unlockTime), created = Number(cap.createdAt);
  if (now >= unlock) return { emoji: "🌸", label: t.stBloom };
  const p = Math.max(0, Math.min(1, (now - created) / (unlock - created)));
  const idx = Math.min(3, Math.floor(p * 4));
  return [
    { emoji: "🌱", label: t.stSeed },
    { emoji: "🌿", label: t.stSprout },
    { emoji: "🪴", label: t.stGrow },
    { emoji: "🌳", label: t.stTree },
  ][idx];
}

function fmtCountdown(secs, dayLabel) {
  if (secs <= 0) return "0";
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${d}${dayLabel} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function CapsuleCard({ id, address, now, t, busy, run }) {
  const owner = useReadContract({
    address: CAPSULE, abi: capsuleAbi, functionName: "ownerOf", args: [BigInt(id)],
  });
  const cap = useReadContract({
    address: CAPSULE, abi: capsuleAbi, functionName: "capsules", args: [BigInt(id)],
    query: { refetchInterval: 5000 },
  });

  const isMine = owner.data && address && owner.data.toLowerCase() === address.toLowerCase();
  if (!isMine || !cap.data) return null;

  // viem이 tuple을 배열로 주든 객체로 주든 안전하게 읽기
  const d = cap.data;
  const get = (i, name) => (Array.isArray(d) ? d[i] : d[name]);
  const c = {
    amount: get(1, "amount"),
    createdAt: get(2, "createdAt"),
    unlockTime: get(3, "unlockTime"),
    message: get(4, "message"),
    status: Number(get(5, "status")),
  };
  const amt = Number(formatUnits(c.amount, 18));
  const unlock = Number(c.unlockTime);
  const remaining = unlock - now;
  const bloomed = remaining <= 0;
  const st = stageOf(c, now, t);
  const [pillCls, pillLabel] = statusPill(c.status, t);

  async function doBreak() {
    if (!window.confirm(t.breakWarn)) return;
    await run(t.breaking, () =>
      sendTx({ address: CAPSULE, abi: capsuleAbi, functionName: "breakEarly", args: [BigInt(id)] })
    );
    cap.refetch();
  }
  async function doRedeem() {
    await run(t.redeeming, () =>
      sendTx({ address: CAPSULE, abi: capsuleAbi, functionName: "redeem", args: [BigInt(id)] })
    );
    cap.refetch();
  }

  return (
    <div className="cap">
      <div className="emoji">{st.emoji}</div>
      <div className="body">
        <div className="top">
          <span className="amt">{amt.toLocaleString()} mTSLA</span>
          <span className={"pill " + pillCls}>{pillLabel}</span>
          <span className="muted small mono">#{id}</span>
        </div>
        <div className="meta">
          {c.status === 0
            ? bloomed
              ? `🌸 ${t.bloomed}`
              : `${st.label} · ${t.toBloom} ${fmtCountdown(remaining, t.day)}`
            : st.label}
          {c.message ? ` · “${c.message}”` : ""}
        </div>
      </div>
      {c.status === 0 && (
        <div className="actions">
          {bloomed ? (
            <button className="btn sm" disabled={busy} onClick={doRedeem}>{t.redeem}</button>
          ) : (
            <button className="btn amber sm" disabled={busy} onClick={doBreak}>{t.breakE}</button>
          )}
        </div>
      )}
    </div>
  );
}
