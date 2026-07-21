import { useEffect, useState, useRef } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain, useReadContract, useReadContracts } from "wagmi";
import { readContract, writeContract, waitForTransactionReceipt } from "wagmi/actions";
import { parseUnits, formatUnits, maxUint256, isAddress, parseEther } from "viem";
import { config, robinhoodTestnet } from "./wagmi";
import { capsuleAbi, erc20Abi } from "./abi";
import { CAPSULE, STOCK, EXPLORER, TOKENS, symbolOf } from "./contracts";

const DUR = [30, 90, 180, 365];

// public/ 에셋 경로 (GitHub Pages base 대응)
const asset = (p) => import.meta.env.BASE_URL + p;

const T = {
  ko: {
    nav_how: "작동 방식", nav_build: "캡슐 만들기", nav_trust: "신뢰",
    connect: "지갑 연결", disconnect: "연결 해제", wrongNet: "네트워크 전환",
    eyebrow: "다이아 핸드를 위해 만들었습니다",
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
    custom: "직접 입력", customPh: "토큰 컨트랙트 주소 0x…", customHold: "내 지갑에 있는 토큰 주소를 붙여넣으면 그 토큰을 그대로 잠급니다.", badAddr: "올바른 주소가 아닙니다 (0x… 42자).", needToken: "먼저 자산(토큰)을 선택하거나 주소를 입력하세요.",
    nb_label: "절대 해제 불가 (하드 락)", nb_desc: "한 번 잠그면 만기까지 절대 못 깹니다 — 진짜 다이아 핸드. 선택 시 $0.50 상당의 ETH 수수료(시세 따라 변동).", nb_fee: "수수료", nb_badge: "해제불가", nb_priceErr: "시세 조회 실패 — 최소 수수료 적용",
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
    stat_people: "참여자", stat_caps: "생성된 캡슐", stat_locked: "현재 잠긴 캡슐",
    disclaimer: "데모입니다. 토큰화 주식은 실제 주식과 법적 지위가 다르며(의결권·소유권 제한), 투자에는 원금 손실 위험이 있습니다.",
    faq_k: "자세히", faq_h: "작동 원리, 하나씩",
    faq: [
      { q: "잠근 동안에도 배당을 받나요?", a: "네. Robinhood Stock Token은 배당이 토큰 가치(multiplier)로 반영되는 방식이라, 캡슐에 잠겨 있어도 배당은 자동으로 쌓입니다. 토큰 개수는 그대로지만 만기에 꺼낼 때 더 가치 있는 토큰이 됩니다. 컨트랙트가 따로 하는 일 없이 복리로 굴러갑니다." },
      { q: "조기파기 페널티는 어디로 가나요?", a: "누군가 조기파기할 때마다, 그 페널티는 바로 그 순간 잠겨 있는 홀더들에게 즉시 분배되어 쌓입니다(한 번에 몰아주는 게 아니라 사건마다 그때그때). 각자의 몫은 ‘잠근 금액 × 잠근 기간’에 비례해서, 오래·많이 잠글수록 더 받습니다. 이미 만기로 빠져나간 사람이나 나중에 들어온 사람은 그 몫을 받지 않아 공평합니다." },
      { q: "수수료는 어떻게 되나요?", a: "생성과 회수 모두 무료입니다. 유일한 수수료는 조기파기 페널티(10%) 중 0.5%뿐이고, 나머지 99.5%는 전부 끝까지 버틴 홀더들에게 돌아갑니다. 즉 대부분의 페널티는 개발자가 아니라 커뮤니티(버틴 사람들)의 몫입니다." },
      { q: "'절대 해제 불가' 옵션은 뭔가요?", a: "캡슐 생성 시 켤 수 있는 하드 락입니다. 켜면 만기 전에는 어떤 방법으로도(페널티를 물더라도) 깰 수 없습니다 — 진짜 다이아 핸드 모드. 대신 $0.50 상당의 ETH를 개발자 수수료로 납부하며, 그 ETH 금액은 시세에 따라 자동으로 조정됩니다. 만기가 되면 정상적으로 회수할 수 있습니다." },
      { q: "여러 종류의 주식 토큰을 잠글 수 있나요?", a: "네. 캡슐은 특정 토큰에 묶여 있지 않습니다. 토큰마다 별도의 보상 풀이 관리되어, TSLA 페널티는 TSLA 홀더에게, AMZN 페널티는 AMZN 홀더에게 갑니다." },
      { q: "자산은 누가 보관하나요? 서비스가 사라지면요?", a: "회사가 아니라 스마트 컨트랙트가 보관합니다(비수탁). 인출·정지·업그레이드 권한이 코드에 없어 개발자도 손댈 수 없습니다. 이 사이트가 사라져도 컨트랙트는 체인에 남아, 익스플로러에서 직접 회수할 수 있습니다." },
    ],
  },
  en: {
    nav_how: "How it works", nav_build: "Create", nav_trust: "Trust",
    connect: "Connect Wallet", disconnect: "Disconnect", wrongNet: "Switch network",
    eyebrow: "Made for diamond hands",
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
    custom: "Custom", customPh: "Token contract address 0x…", customHold: "Paste a token address from your wallet to lock that token as-is.", badAddr: "Not a valid address (0x…, 42 chars).", needToken: "Pick an asset or enter a token address first.",
    nb_label: "No early exit (hard lock)", nb_desc: "Once locked, it can never be broken before maturity — true diamond hands. Costs an ETH fee worth $0.50 (varies with price).", nb_fee: "Fee", nb_badge: "No-break", nb_priceErr: "Price lookup failed — minimum fee applied",
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
    stat_people: "Participants", stat_caps: "Capsules created", stat_locked: "Currently locked",
    disclaimer: "Demo. Tokenized stocks differ legally from real shares (limited voting/ownership), and investing carries risk of loss.",
    faq_k: "In depth", faq_h: "How it works, one by one",
    faq: [
      { q: "Do I still earn dividends while locked?", a: "Yes. Robinhood Stock Tokens reflect dividends in the token's value (a multiplier), so dividends accrue automatically even while your tokens are locked in a capsule. Your token count stays the same, but each token is worth more at maturity. It compounds without the contract doing anything." },
      { q: "Where does the early-break penalty go?", a: "Every time someone breaks early, their penalty is distributed instantly to whoever is locked at that exact moment — not in one lump later, but per event as it happens. Each holder's share is proportional to ‘amount locked × time locked’, so the longer and larger you lock, the more you get. People who already redeemed and left, or who join later, don't get that slice — which keeps it fair." },
      { q: "What are the fees?", a: "Creating and redeeming are both free. The only fee is 0.5% of the 10% early-break penalty — the other 99.5% goes entirely to holders who stay. So most of the penalty belongs to the community (the holders), not the developer." },
      { q: "What is the 'no early exit' option?", a: "A hard lock you can turn on when creating a capsule. With it on, the capsule can't be broken before maturity by any means (not even by paying the penalty) — true diamond-hands mode. It costs an ETH fee worth $0.50, and the ETH amount adjusts automatically with the price. At maturity you redeem as usual." },
      { q: "Can I lock different kinds of stock tokens?", a: "Yes. A capsule isn't tied to one token. Each token has its own reward pool, so TSLA penalties go to TSLA holders and AMZN penalties go to AMZN holders." },
      { q: "Who custodies the assets? What if the service disappears?", a: "A smart contract holds them, not a company (non-custodial). No withdraw, pause, or upgrade powers exist in the code — not even the developer can touch them. If this site vanishes, the contract stays on-chain and you can redeem directly from the explorer." },
    ],
  },
  zh: {
    nav_how: "工作原理", nav_build: "创建胶囊", nav_trust: "信任",
    connect: "连接钱包", disconnect: "断开", wrongNet: "切换网络",
    eyebrow: "为钻石手而生",
    h1a: "给未来的自己一个", h1b: "承诺。",
    lead: "把股票代币锁进胶囊。坚持到到期就能全额取回，期间胶囊还会成长。中途打破，罚金归坚持到底的人所有。",
    cta1: "创建胶囊", cta2: "查看工作原理",
    chip1: "管理员无法提取", chip2: "由合约保管", chip3: "24/7 链上",
    cc_tag: "示例", cc_mine: "我的胶囊", cc_progress: "距开花",
    cc_locked: "锁定资产", cc_unlock: "距开花",
    how_k: "工作原理", how_h: "锁定 · 坚持 · 开花",
    how_p: "只有三步。没有银行、没有中介、没有管理员——规则都刻在合约里。",
    s1h: "锁定", s1p: "存入股票代币并设定到期时间。代币会变成你的胶囊(NFT)，由合约保管。",
    s2h: "坚持", s2p: "随着时间推移，胶囊不断成长——从种子到盛开。每当有人提前打破，其罚金会在那一刻立即分配给正在坚持的你。而且锁定的股票代币还会自动累积分红(multiplier)。",
    s3h: "开花", s3p: "到期后，取回全部本金加上累积的奖励。胶囊 NFT 作为纪念保留。",
    b_k: "创建胶囊", b_h: "锁多少，锁多久", b_p: "设定金额和期限，罚金与奖励条件会实时计算。",
    connectPrompt: "请先连接钱包以创建胶囊。",
    balance: "我的余额", faucet: "领取 1,000 个测试代币",
    asset: "选择资产", amount: "锁定金额", dur: "锁定期限", msg: "给未来的自己 (可选)", msgPh: "拿住别卖！",
    custom: "自定义", customPh: "代币合约地址 0x…", customHold: "粘贴你钱包里的代币地址，即可锁定该代币。", badAddr: "不是有效地址 (0x…，42 位)。", needToken: "请先选择资产或输入代币地址。",
    nb_label: "永不提前解锁 (硬锁)", nb_desc: "一旦锁定，到期前绝不可打破——真正的钻石手。选择需支付价值 $0.50 的 ETH 手续费（随价格浮动）。", nb_fee: "手续费", nb_badge: "永久锁定", nb_priceErr: "价格获取失败——采用最低手续费",
    lock: "锁定胶囊", day: "天",
    sum_title: "摘要", sum_lock: "锁定金额", sum_unlock: "开花日", sum_penalty: "提前打破罚金", sum_share: "奖励份额",
    sum_mintfee: "创建费", sum_redeemfee: "取回费", free: "免费", cap_reward: "奖励累积",
    w_title: "奖励份额权重", w_note_a: "即使金额相同，", w_note_b: "锁得越久", w_note_c: "，从罚金池分到的份额就越大。份额 = 金额 × 锁定时长。",
    warn_a: "在到期前打破，你会损失 ", warn_b: "10%", warn_c: "，这笔罚金将分配给坚持到底的其他胶囊持有者。",
    myCaps: "我的胶囊", empty: "还没有胶囊。在上方创建一个吧。",
    locked: "持有中", redeemed: "已取回", broken: "已打破",
    toBloom: "距开花", bloomed: "已开花 — 可取回", redeem: "取回", breakE: "提前打破 -10%",
    stSeed: "种子", stSprout: "嫩芽", stGrow: "成长中", stTree: "大树", stBloom: "盛开", withered: "枯萎",
    breakWarn: "确定要打破吗？你将损失 10%，罚金会给到坚持到底的人。",
    approving: "正在授权代币… 请在钱包中确认", minting: "正在创建胶囊… 请在钱包中确认",
    fauceting: "正在领取代币… 请在钱包中确认", breaking: "正在打破… 请在钱包中确认", redeeming: "正在取回… 请在钱包中确认",
    done: "完成！🎉", needFaucet: "余额不足。请先点击‘领取测试代币’充值。",
    t_k: "为什么可以信任", t_h: "我们绝不触碰你的资产",
    t_p: "Diamond Capsule 是非托管协议。你的代币由公开的智能合约保管，而非某家公司。",
    t1h: "没有管理员后门", t1p: "代码中不存在提取、暂停或升级权限。连开发者也无法打开你的胶囊。",
    t2h: "即使服务消失", t2p: "即使本站点消失，合约仍留在链上。你可以直接从区块浏览器取回。",
    t3h: "全部可验证", t3p: "所有规则和余额都在链上公开。源代码也可在区块浏览器验证。",
    c_lbl: "胶囊合约 (测试网)", c_link: "在区块浏览器查看 →",
    foot: "Robinhood Chain 上的时间胶囊股票 NFT",
    stat_people: "参与者", stat_caps: "已创建胶囊", stat_locked: "当前锁定",
    disclaimer: "这是演示。代币化股票在法律地位上与真实股票不同(投票权、所有权受限)，投资有本金损失风险。",
    faq_k: "详解", faq_h: "逐条讲解工作原理",
    faq: [
      { q: "锁定期间还能获得分红吗？", a: "可以。Robinhood 股票代币通过代币价值(multiplier)体现分红，因此即使代币锁在胶囊里，分红也会自动累积。代币数量不变，但到期取出时每个代币更值钱。无需合约做任何事，就以复利方式增长。" },
      { q: "提前打破的罚金去哪了？", a: "每当有人提前打破，其罚金会在那一刻立即分配给当时正在锁定的持有者（不是事后一次性发放，而是每次事件即时发生）。每人的份额与‘锁定金额 × 锁定时长’成正比，锁得越久、越多就分得越多。已到期离场或之后才加入的人不会分到那份，从而保证公平。" },
      { q: "手续费怎么算？", a: "创建和取回都免费。唯一的费用是 10% 提前打破罚金中的 0.5%，其余 99.5% 全部归坚持到底的持有者。也就是说大部分罚金属于社区（持有者），而非开发者。" },
      { q: "‘永不提前解锁’选项是什么？", a: "创建胶囊时可开启的硬锁。开启后，到期前无论如何都无法打破（即使支付罚金也不行）——真正的钻石手模式。需支付价值 $0.50 的 ETH 手续费，该 ETH 数量会随价格自动调整。到期后可正常取回。" },
      { q: "可以锁定不同种类的股票代币吗？", a: "可以。胶囊不绑定于某一种代币。每种代币有各自独立的奖励池，因此 TSLA 的罚金归 TSLA 持有者，AMZN 的罚金归 AMZN 持有者。" },
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
  const [lang, setLang] = useState("en");
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
          <div className="logo"><img className="logo-img" src={asset("logo.png")} alt="" />Diamond Capsule</div>
          <div className="nav-links">
            <a href="#how">{t.nav_how}</a><a href="#learn">{t.faq_k}</a><a href="#build">{t.nav_build}</a><a href="#trust">{t.nav_trust}</a>
          </div>
          <div className="nav-right">
            <button className="theme-btn" onClick={() => setTheme(dark ? "light" : "dark")}>{dark ? "☀️" : "🌙"}</button>
            <select className="lang" value={lang} onChange={(e) => setLang(e.target.value)} aria-label="language">
              <option value="ko">한국어</option>
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
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

      <Stats t={t} />

      <section id="how"><div className="wrap">
        <div className="how-top">
          <div className="sec-head" style={{ marginBottom: 0 }}>
            <div className="kicker">{t.how_k}</div><h2>{t.how_h}</h2><p>{t.how_p}</p>
          </div>
          <img className="section-art" src={asset("hero.png")} alt="" aria-hidden="true" />
        </div>
        <div className="steps" style={{ marginTop: 40 }}>
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
          <div className="logo"><img className="logo-img" src={asset("logo.png")} alt="" />Diamond Capsule</div>
          <span>{t.foot}</span>
        </div>
        <p className="disclaimer">{t.disclaimer}</p>
      </div></footer>
    </>
  );
}

function Stats({ t }) {
  const nextId = useReadContract({ address: CAPSULE, abi: capsuleAbi, functionName: "nextId", query: { refetchInterval: 10000 } });
  const count = nextId.data ? Number(nextId.data) : 0;
  const ids = Array.from({ length: count }, (_, i) => i);

  const owners = useReadContracts({
    contracts: ids.map((id) => ({ address: CAPSULE, abi: capsuleAbi, functionName: "ownerOf", args: [BigInt(id)] })),
    query: { enabled: count > 0, refetchInterval: 15000 },
  });
  const caps = useReadContracts({
    contracts: ids.map((id) => ({ address: CAPSULE, abi: capsuleAbi, functionName: "capsules", args: [BigInt(id)] })),
    query: { enabled: count > 0, refetchInterval: 15000 },
  });

  const uniq = new Set();
  if (owners.data) owners.data.forEach((r) => { if (r?.status === "success") uniq.add(String(r.result).toLowerCase()); });
  let lockedNow = 0;
  if (caps.data) caps.data.forEach((r) => {
    if (r?.status === "success") { const d = r.result; const s = Number(Array.isArray(d) ? d[5] : d.status); if (s === 0) lockedNow++; }
  });

  const tiles = [
    { v: uniq.size, k: t.stat_people },
    { v: count, k: t.stat_caps },
    { v: lockedNow, k: t.stat_locked },
  ];
  return (
    <section style={{ paddingTop: 0, paddingBottom: 44 }}><div className="wrap">
      <div className="stats-row">
        {tiles.map((s, i) => (
          <div className="stat-tile" key={i}>
            <div className="sv mono">{s.v.toLocaleString()}</div>
            <div className="sk">{s.k}</div>
          </div>
        ))}
      </div>
    </div></section>
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
  const [sel, setSel] = useState(TOKENS[0].address); // 프리셋 주소 또는 "custom"
  const [customAddr, setCustomAddr] = useState("");
  const [amount, setAmount] = useState("100");
  const [days, setDays] = useState(90);
  const [message, setMessage] = useState("");
  const [noBreak, setNoBreak] = useState(false);
  const [ethPrice, setEthPrice] = useState(null);
  const { busy, status, err, run, setStatus, setErr } = useTxRunner(t);

  useEffect(() => {
    let alive = true;
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
      .then((r) => r.json())
      .then((d) => { if (alive && d?.ethereum?.usd) setEthPrice(d.ethereum.usd); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // '절대 해제 불가' 옵션 수수료 = $0.50 상당 ETH (시세 동적), 최소 floor 이상
  const floorRead = useReadContract({ address: CAPSULE, abi: capsuleAbi, functionName: "noBreakFeeWei" });
  const floor = floorRead.data ?? 0n;
  let feeWei = 0n;
  if (noBreak) {
    if (ethPrice) {
      const dyn = parseEther((0.5 / ethPrice).toFixed(18));
      feeWei = dyn > floor ? dyn : floor;
    } else {
      feeWei = floor;
    }
  }
  const feeEthStr = feeWei > 0n ? Number(formatUnits(feeWei, 18)).toLocaleString(undefined, { maximumFractionDigits: 6 }) : "0";

  const isCustom = sel === "custom";
  const activeToken = isCustom ? (isAddress(customAddr) ? customAddr : null) : sel;
  const isMock = !!activeToken && TOKENS.some((x) => x.address.toLowerCase() === activeToken.toLowerCase());

  const symRead = useReadContract({ address: activeToken || undefined, abi: erc20Abi, functionName: "symbol", query: { enabled: !!activeToken } });
  const decRead = useReadContract({ address: activeToken || undefined, abi: erc20Abi, functionName: "decimals", query: { enabled: !!activeToken } });
  const decimals = decRead.data != null ? Number(decRead.data) : 18;
  const symbol = !activeToken ? "?" : isCustom ? (symRead.data || "…") : symbolOf(activeToken);
  const badgeChar = symbol && symbol[0] === "m" ? symbol[1] : (symbol[0] || "?");

  const balance = useReadContract({
    address: activeToken || undefined, abi: erc20Abi, functionName: "balanceOf", args: [address],
    query: { enabled: !!activeToken, refetchInterval: 4000 },
  });
  const bal = balance.data != null ? Number(formatUnits(balance.data, decimals)) : 0;
  const amt = Number(amount) || 0;

  async function faucet() {
    await run(t.fauceting, () => sendTx({ address: activeToken, abi: erc20Abi, functionName: "faucet", args: [parseUnits("1000", decimals)] }));
    balance.refetch();
  }

  async function createCapsule() {
    if (!activeToken) { setErr(true); setStatus(t.needToken); return; }
    const amtWei = parseUnits(amount || "0", decimals);
    if (balance.data != null && balance.data < amtWei) {
      setErr(true); setStatus(t.needFaucet); return;
    }
    await run(t.approving, async () => {
      const allowance = await readContract(config, { address: activeToken, abi: erc20Abi, functionName: "allowance", args: [address, CAPSULE] });
      if (allowance < amtWei) {
        await sendTx({ address: activeToken, abi: erc20Abi, functionName: "approve", args: [CAPSULE, maxUint256] });
      }
      setStatus(t.minting);
      const unlock = BigInt(Math.floor(Date.now() / 1000) + days * 86400);
      await sendTx({ address: CAPSULE, abi: capsuleAbi, functionName: "mint", args: [activeToken, amtWei, unlock, message || "", noBreak], value: feeWei });
    });
    balance.refetch();
  }

  return (
    <>
      <div className="bal-card" style={{ marginBottom: 24 }}>
        <div><div className="k">{t.balance}</div><div className="v">{bal.toLocaleString()} <small>{symbol}</small></div></div>
        {isMock && <button className="btn-ghost" disabled={busy} onClick={faucet}>{t.faucet} ({symbol})</button>}
      </div>

      <div className="builder-grid">
        <div className="builder">
          <div className="field">
            <label>{t.asset}</label>
            <div className="durs" style={{ gridTemplateColumns: `repeat(${TOKENS.length + 1}, 1fr)` }}>
              {TOKENS.map((tt) => (
                <button key={tt.address} className={"dur" + (sel === tt.address ? " active" : "")} onClick={() => setSel(tt.address)}>
                  <div className="d">{tt.symbol}</div>
                </button>
              ))}
              <button className={"dur" + (isCustom ? " active" : "")} onClick={() => setSel("custom")}>
                <div className="d">{t.custom}</div>
              </button>
            </div>
            {isCustom && (
              <div style={{ marginTop: 10 }}>
                <div className="amount-in text">
                  <input value={customAddr} placeholder={t.customPh} spellCheck={false}
                    onChange={(e) => setCustomAddr(e.target.value.trim())} style={{ fontFamily: "var(--mono)", fontSize: 14 }} />
                </div>
                <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8 }}>
                  {customAddr && !isAddress(customAddr) ? t.badAddr : t.customHold}
                </p>
              </div>
            )}
          </div>
          <div className="field">
            <label>{t.amount}</label>
            <div className="amount-in">
              <input value={amount} inputMode="decimal" onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
              <span className="tk"><span className="badge">{badgeChar}</span>{symbol}</span>
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
          <div className={"nobreak" + (noBreak ? " on" : "")}>
            <label className="nb-head">
              <input type="checkbox" checked={noBreak} onChange={(e) => setNoBreak(e.target.checked)} />
              <span>🔒 {t.nb_label}</span>
            </label>
            <p className="nb-desc">{t.nb_desc}</p>
            {noBreak && (
              <div className="nb-fee">
                {t.nb_fee}: ≈ $0.50 {feeWei > 0n ? `(${feeEthStr} ETH)` : ""}
                {!ethPrice && <span className="nb-warn"> · {t.nb_priceErr}</span>}
              </div>
            )}
          </div>
          <button className="btn-primary" disabled={busy || !(amt > 0) || !activeToken} onClick={createCapsule}>{t.lock}</button>
          {status && <div className={"status-line" + (err ? " err" : "")}>{status}</div>}
        </div>

        <div className="summary">
          <div className="sum-card">
            <h4>{t.sum_title}</h4>
            <div className="sum-row"><span className="lbl">{t.sum_lock}</span><span className="val">{amt.toLocaleString()} {symbol}</span></div>
            <div className="sum-row"><span className="lbl">{t.sum_unlock}</span><span className="val">+{days}{t.day}</span></div>
            <div className="sum-row"><span className="lbl">{t.sum_mintfee}</span><span className="val" style={{ color: "var(--rh-deep)" }}>{t.free}</span></div>
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
  const noBreak = Boolean(get(7, "noBreak"));
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
          {noBreak && <span className="pill hard">🔒 {t.nb_badge}</span>}
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
            : noBreak
              ? <span className="pill hard">🔒 {t.nb_badge}</span>
              : <button className="btn-amber" disabled={busy} onClick={doBreak}>{t.breakE}</button>}
        </div>
      )}
    </div>
  );
}
