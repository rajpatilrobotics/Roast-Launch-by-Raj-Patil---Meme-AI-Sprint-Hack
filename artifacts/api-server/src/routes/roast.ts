import { Router, type IRouter } from "express";
import { textGen } from "../lib/textGen";
import { db, activityHistoryTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

export type RoastResult = {
  id: string;
  tokenIdea: string;
  tokenName?: string;
  ticker?: string;
  bull: string;
  skeptic: string;
  rug: string;
  score: number;
  rugProbability: number;
  narrative: number;
  community: number;
  timing: number;
  risk: number;
  verdict: "NGMI" | "DYOR" | "WAGMI";
  summary: string;
  fixedBrief: string[];
  sevenDayPlan: Record<string, string>;
  memeTexts: string[];
  fitsMeta: boolean;
  hotMeta: string;
  graduationProbability: number;
  graduationReason: string;
  txHash?: string;
  launched?: boolean;
  launchedAt?: number;
  timestamp: number;
};

export const history: RoastResult[] = [];
export const dailyCounter = { date: new Date().toISOString().slice(0, 10), count: 0 };

function bumpCounter() {
  const today = new Date().toISOString().slice(0, 10);
  if (dailyCounter.date !== today) {
    dailyCounter.date = today;
    dailyCounter.count = 0;
  }
  dailyCounter.count += 1;
}

let trendingCache: { ts: number; data: { tokens: string[]; raw: any[] } } | null = null;
let metaCache: { ts: number; meta: string } | null = null;

export async function fetchTrending(): Promise<{ tokens: string[]; raw: any[] }> {
  const now = Date.now();
  if (trendingCache && now - trendingCache.ts < 60_000) return trendingCache.data;

  const endpoints = [
    "https://four.meme/meme-api/v1/private/token/list?orderBy=Trending&page=1&pageSize=20&listedPancake=false&symbol=&labels=&tradeMin=0",
    "https://four.meme/api/v1/token/list?sort=trending&limit=20",
    "https://four.meme/api/token/list",
    "https://api.four.meme/token/list",
  ];

  let raw: any[] = [];
  for (const url of endpoints) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      });
      if (!r.ok) continue;
      const j = await r.json();
      const list = (j?.data?.list || j?.data || j?.list || j?.tokens || j) as any[];
      if (Array.isArray(list) && list.length > 0) {
        raw = list.slice(0, 20);
        break;
      }
    } catch {
      // try next
    }
  }

  if (raw.length === 0) {
    raw = [
      { name: "AI Doge", symbol: "AIDOGE", description: "Doge meets AI agents" },
      { name: "Pepe Trump", symbol: "PTRUMP", description: "Political pepe meta" },
      { name: "Anime Cat", symbol: "ANCAT", description: "Anime girl with a cat" },
      { name: "Brain Rot", symbol: "BRAIN", description: "Italian brainrot meme" },
      { name: "MoonChad", symbol: "MCHAD", description: "Pure degen energy" },
    ];
  }

  const tokens = raw.map((t) => t.name || t.symbol || t.tokenName || "Unknown").filter(Boolean);
  const data = { tokens, raw };
  trendingCache = { ts: now, data };
  return data;
}

export async function classifyMeta(tokens: string[]): Promise<string> {
  const now = Date.now();
  if (metaCache && now - metaCache.ts < 5 * 60_000) return metaCache.meta;
  try {
    const text = await textGen(
      `Given these trending meme coins on Four.meme: ${tokens.slice(0, 15).join(", ")}\n\nClassify the dominant narrative as ONE of: AI coins, Dog coins, Political, Anime, Degen humor, Other. Reply with ONLY the category, nothing else.`,
    );
    const cats = ["AI coins", "Dog coins", "Political", "Anime", "Degen humor", "Other"];
    const meta = cats.find((c) => text.toLowerCase().includes(c.toLowerCase())) || "Degen humor";
    metaCache = { ts: now, meta };
    return meta;
  } catch {
    return "Degen humor";
  }
}

export async function runRoast(input: {
  tokenIdea: string;
  tokenName?: string;
  ticker?: string;
  userName?: string;
  remixOfId?: number;
  remixOfUser?: string;
}): Promise<RoastResult> {
  const { tokenIdea, tokenName, ticker, userName, remixOfId, remixOfUser } = input;
  const ctx = `Idea: "${tokenIdea}"${tokenName ? ` | Name: ${tokenName}` : ""}${
    ticker ? ` | Ticker: ${ticker}` : ""
  }`;

  const trending = await fetchTrending().catch(() => ({ tokens: [] as string[], raw: [] }));
  const meta = await classifyMeta(trending.tokens).catch(() => "Degen humor");

  const styleNonces = [
    "Lean into absurdist humor — the kind of joke that makes Crypto Twitter screenshot it.",
    "Channel a stand-up comedian doing a tight 5 about this coin. Punchlines required.",
    "Be brutally honest like a Shark Tank panel that hates everyone.",
    "Imagine you're roasting this at a degen dinner party in Dubai. Make it SHARP.",
    "Write like a Twitch streamer reacting live — ad-libs, callbacks, specific roasts.",
  ];
  const nonce = styleNonces[Math.floor(Math.random() * styleNonces.length)];

  const systemMsg = `You are the writers' room for a meme coin roast show. Your output is JUDGED on:
1) SPECIFICITY — every sentence references the exact pitch (name, animal, gimmick, ticker).
2) HUMOR — the skeptic and rug judges should make readers laugh out loud.
3) ZERO FILLER — no "to the moon", no "WAGMI ser", no "just another meme", no "Tokenomics, dev credibility, copy-paste narrative" lists.
You will be REPLACED if your output is generic. ${nonce}`;

  const combinedPrompt = `Roast this meme coin pitch for Four.meme (BNB Chain). 

TOKEN PITCH: ${ctx}
Trending on Four.meme: ${trending.tokens.slice(0, 8).join(", ") || "n/a"}
Hot meta: ${meta}

Write 3 judges. Each judge MUST be 50-80 words, in their voice, with at least 2 SPECIFIC references to the pitch.

============ EXAMPLE OUTPUT (for a pitch "a frog that trades crypto in its sleep, $ZZZ") ============

bull: "Bro, $ZZZ is genius — passive income narrative + frog meta = sleeper hit. The 'sleep trading' angle prints itself: imagine the chart 'waking up' at 3 AM EST when Asia FOMOs in. Pepe walked so SleepFrog could nap. I'm aping rent, ser."

skeptic: "A frog. That sleeps. Trading crypto. Did we just describe 90% of Telegram admins? The 'ZZZ' ticker is going to confuse every screen reader on CT, and the gimmick has zero memetic hook beyond the first day. This is what 'Pepe ran out of ideas' looks like."

rug: "⚠️ The 'sleeps while trading' lore conveniently means devs can vanish for 48 hours and call it 'in character'. ⚠️ ZZZ ticker has no Etherscan distinctiveness — copycats will spawn within an hour. ⚠️ No on-chain proof mechanism for the 'sleep trading' gimmick = pure vibes-based valuation."

memeTexts: ["When SleepFrog wakes up at $1B mcap", "Hibernating to 100x", "ZZZ holders sleeping on generational wealth"]

============ END EXAMPLE ============

NOW ROAST THE ACTUAL PITCH ABOVE with the same level of specificity and humor.

SCORING:
- narrative (0-25): originality
- community (0-25): shareability  
- timing (0-25): meta fit (${meta})
- risk (0-25): inverse risk (25 = safe)
- score = sum (0-100)
- rugProbability (0-100): independent
- verdict: NGMI (<40) | DYOR (40-69) | WAGMI (≥70)
- summary: 1 savage sentence, max 15 words
- fixedBrief: 4 specific concrete fixes (no generic "lock LP")
- sevenDayPlan: each day a specific action mentioning WHERE/WITH WHOM (e.g. "Day 3: Pay Murad and 5 anime KOLs $200 each for synced tweets")
- memeTexts: 3 captions max 12 words, each referencing the specific pitch
- fitsMeta: boolean
- graduationProbability (0-100): chance this token reaches Four.meme's graduation threshold (~$80K market cap → migrates to PancakeSwap). Consider narrative virality, community appeal, ticker memorability, meta fit, and rug risk.
- graduationReason: 1 punchy sentence (max 18 words) explaining the graduation odds in plain degen language.

Return ONLY this JSON:
{"bull":"...","skeptic":"...","rug":"...","score":number,"rugProbability":number,"narrative":number,"community":number,"timing":number,"risk":number,"verdict":"NGMI"|"DYOR"|"WAGMI","summary":"...","fixedBrief":["...","...","...","..."],"sevenDayPlan":{"day1":"...","day2":"...","day3":"...","day4":"...","day5":"...","day6":"...","day7":"..."},"memeTexts":["...","...","..."],"fitsMeta":boolean,"graduationProbability":number,"graduationReason":"..."}`;

  let bull = "";
  let skeptic = "";
  let rug = "";
  let scoreObj: any;
  try {
    let txt = await textGen(combinedPrompt, { json: true, system: systemMsg });
    txt = txt.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    const m = txt.match(/\{[\s\S]*\}/);
    scoreObj = JSON.parse(m ? m[0] : txt);
    bull = String(scoreObj.bull || "");
    skeptic = String(scoreObj.skeptic || "");
    rug = String(scoreObj.rug || "");
  } catch (e: any) {
    console.error("[roast] gemini error:", String(e?.message || e).slice(0, 500));
    const isRate = String(e?.message || e).includes("429");
    const note = isRate
      ? "⏳ Gemini free-tier rate limit hit. Wait ~30s and try again."
      : "(AI temporarily unavailable)";
    bull = note;
    skeptic = note;
    rug = note;
    scoreObj = {
      score: 50,
      rugProbability: 50,
      narrative: 12,
      community: 13,
      timing: 12,
      risk: 13,
      verdict: "DYOR",
      summary: "Mid-tier meme idea — needs sharper hook.",
      fixedBrief: [
        "Define a clearer narrative angle",
        "Plan community seeding before launch",
        "Lock liquidity and burn LP for trust",
        "Tie messaging to the hot meta",
      ],
      sevenDayPlan: {
        day1: "Lock at least 95% of LP for 6+ months",
        day2: "Build a 1-page site with story + tokenomics",
        day3: "Seed Telegram + X with 50 real holders",
        day4: "Drop teaser memes tied to hot meta",
        day5: "Coordinate with 3-5 micro-influencers",
        day6: "Run AMA + reveal full roadmap",
        day7: "Launch on Four.meme with marketing wave",
      },
      memeTexts: ["When the chart only goes up", "Bears in shambles", "Diamond hands assemble"],
      fitsMeta: false,
      graduationProbability: 35,
      graduationReason: "Mid-tier vibes — needs a sharper hook to graduate.",
    };
  }

  const result: RoastResult = {
    id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tokenIdea,
    tokenName,
    ticker,
    bull,
    skeptic,
    rug,
    score: Math.max(0, Math.min(100, Number(scoreObj.score) || 0)),
    rugProbability: Math.max(0, Math.min(100, Number(scoreObj.rugProbability) || 50)),
    narrative: Number(scoreObj.narrative) || 0,
    community: Number(scoreObj.community) || 0,
    timing: Number(scoreObj.timing) || 0,
    risk: Number(scoreObj.risk) || 0,
    verdict: ["NGMI", "DYOR", "WAGMI"].includes(scoreObj.verdict) ? scoreObj.verdict : "DYOR",
    summary: String(scoreObj.summary || ""),
    fixedBrief: Array.isArray(scoreObj.fixedBrief) ? scoreObj.fixedBrief.slice(0, 6) : [],
    sevenDayPlan: scoreObj.sevenDayPlan && typeof scoreObj.sevenDayPlan === "object"
      ? scoreObj.sevenDayPlan
      : {},
    memeTexts: Array.isArray(scoreObj.memeTexts) ? scoreObj.memeTexts.slice(0, 3) : [],
    fitsMeta: !!scoreObj.fitsMeta,
    hotMeta: meta,
    graduationProbability: Math.max(0, Math.min(100, Number(scoreObj.graduationProbability) || 0)),
    graduationReason: String(scoreObj.graduationReason || ""),
    timestamp: Date.now(),
  };

  history.push(result);
  if (history.length > 50) history.shift();
  bumpCounter();

  if (userName) {
    db.insert(activityHistoryTable).values({
      userName,
      type: "roast",
      coinName: tokenName || tokenIdea.slice(0, 40),
      score: result.score,
      verdict: result.verdict,
      result: result as any,
      remixOfId: remixOfId || null,
      remixOfUser: remixOfUser || null,
    } as any).then((r: any) => {
      try { (result as any).activityId = r?.[0]?.id; } catch {}
    }).catch(() => {});
  }

  return result;
}

router.get("/trending", async (_req, res) => {
  try {
    const { tokens, raw } = await fetchTrending();
    const meta = await classifyMeta(tokens);
    const coins = raw.slice(0, 10).map((t: any) => ({
      name: String(t.name || t.tokenName || t.symbol || "Unknown"),
      symbol: String(t.symbol || t.ticker || "").toUpperCase(),
      description: String(t.description || t.shortDescription || "").slice(0, 160),
    }));
    res.json({ tokens: tokens.slice(0, 10), meta, coins });
  } catch (e: any) {
    res.json({ tokens: [], meta: "Degen humor", coins: [], error: e.message });
  }
});

router.get("/history", (_req, res) => {
  res.json({
    history: history.slice(-10).reverse(),
    todayCount: dailyCounter.count,
  });
});

router.post("/roast", async (req, res) => {
  const { tokenIdea, tokenName, ticker, userName, remixOfId, remixOfUser } = req.body || {};
  if (!tokenIdea || typeof tokenIdea !== "string") {
    return res.status(400).json({ error: "tokenIdea required" });
  }
  const result = await runRoast({ tokenIdea, tokenName, ticker, userName, remixOfId, remixOfUser });
  res.json(result);
});

router.post("/roast/remix", async (req, res) => {
  const { parentId, twist, userName } = req.body || {};
  if (!parentId || !twist) return res.status(400).json({ error: "parentId and twist required" });
  try {
    const [parent] = await db.select().from(activityHistoryTable).where(eq(activityHistoryTable.id, Number(parentId)));
    if (!parent) return res.status(404).json({ error: "parent not found" });
    const parentResult: any = parent.result || {};
    const baseIdea = parentResult.idea || parentResult.tokenIdea || parent.coinName;
    const newIdea = `${baseIdea} — but ${twist}`;
    const newName = `${parent.coinName} (${twist.slice(0, 24)})`;
    const result = await runRoast({
      tokenIdea: newIdea,
      tokenName: newName,
      ticker: parentResult.ticker,
      userName,
      remixOfId: parent.id,
      remixOfUser: parent.userName,
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "remix failed" });
  }
});

router.post("/launch", async (req, res) => {
  const { id, userName, tokenName, ticker, tokenIdea, score, verdict } = req.body || {};
  if (!ticker || typeof ticker !== "string") {
    return res.status(400).json({ error: "ticker required" });
  }
  const item = id ? history.find((h) => h.id === id) : null;
  if (item) {
    item.launched = true;
    item.launchedAt = Date.now();
  }
  if (userName) {
    try {
      await db.insert(activityHistoryTable).values({
        userName,
        type: "launch",
        coinName: tokenName || tokenIdea || ticker,
        score: typeof score === "number" ? score : item?.score ?? null,
        verdict: verdict || item?.verdict || null,
        result: {
          ticker: ticker.toUpperCase(),
          tokenName: tokenName || item?.tokenName,
          tokenIdea: tokenIdea || item?.tokenIdea,
          launchedAt: Date.now(),
          platform: "four.meme",
        } as any,
      } as any);
    } catch (e: any) {
      console.error("[launch] db insert failed:", e?.message);
    }
  }
  res.json({ ok: true, launched: true });
});

router.post("/history/txhash", (req, res) => {
  const { id, txHash } = req.body || {};
  const item = history.find((h) => h.id === id);
  if (item && typeof txHash === "string") {
    item.txHash = txHash;
  }
  res.json({ ok: true });
});

export default router;
