import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { API } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";

type MetaPreset = {
  label: string;
  idea: string;
  name: string;
  ticker: string;
};

const META_PRESETS: Record<string, MetaPreset[]> = {
  "AI coins": [
    { label: "🤖 Roast an AI agent coin", idea: "AI agent that auto-trades meme coins and shares profits with holders", name: "AgentFi", ticker: "AGFI" },
    { label: "🧠 Roast an LLM-powered token", idea: "Token where an LLM decides tokenomics in real time", name: "BrainCoin", ticker: "BRAIN" },
    { label: "🦾 Roast an AI rugger", idea: "AI that rugs other AI agents for the lulz", name: "RugBot", ticker: "RBOT" },
  ],
  "Dog coins": [
    { label: "🐕 Roast a Doge variant", idea: "Doge that pays his own crypto taxes on time", name: "Tax Doge", ticker: "TXDOG" },
    { label: "🐶 Roast a Shiba clone", idea: "Shiba that learned to code and built its own dex", name: "DevShib", ticker: "DSHIB" },
    { label: "🦴 Roast a chad dog", idea: "Buff Doge that lifts and only dips on leg day", name: "GymDoge", ticker: "GYMD" },
  ],
  "Political": [
    { label: "🇺🇸 Roast a Trump coin", idea: "Trump's hairpiece as an autonomous DAO", name: "HairDAO", ticker: "HAIR" },
    { label: "🐘 Roast a satire politico", idea: "Senator who only votes when ETH dips below 2k", name: "DipSenator", ticker: "DSEN" },
    { label: "🗳️ Roast an election meta", idea: "Token that pumps every time a politician lies on camera", name: "TruthOmeter", ticker: "LIES" },
  ],
  "Anime": [
    { label: "🐱 Roast an anime girl coin", idea: "Anime catgirl who runs a yield aggregator", name: "NyaFi", ticker: "NYA" },
    { label: "🗡️ Roast a shonen token", idea: "Shonen protagonist that powers up after every dip", name: "ArcCoin", ticker: "ARC" },
    { label: "💕 Roast a waifu coin", idea: "Waifu DAO governed by anime poll voting", name: "WaifuDAO", ticker: "WAIFU" },
  ],
  "Degen humor": [
    { label: "🎰 Roast a casino coin", idea: "Token that gambles on itself every block", name: "RouletteFi", ticker: "ROUL" },
    { label: "🪦 Roast an auto-rugger", idea: "Token that auto-rugs at 100M market cap, transparently", name: "AutoExit", ticker: "EXIT" },
    { label: "🛏️ Roast a lazy yield coin", idea: "Bed that earns yield while you sleep on it", name: "SleepFi", ticker: "ZZZ" },
  ],
  "Other": [
    { label: "🍕 Roast a food coin", idea: "Pizza that mines BNB while you eat it", name: "PizzaMine", ticker: "ZZA" },
    { label: "🛸 Roast a sci-fi coin", idea: "Alien who came to Earth just to short Bitcoin", name: "Alien Short", ticker: "ALSHRT" },
    { label: "🧙 Roast a fantasy coin", idea: "Wizard that turns FUD into liquidity", name: "FUD Wizard", ticker: "FUDW" },
  ],
};

type MetaData = {
  currentMeta: string;
  narratives: { name: string; count: number; status: "graduating" | "rugging" }[];
  heatmap: { hour: number; activity: number }[];
  bestHour: number;
  graveyard: { name: string; reason: string }[];
  forecast: { narrative: string; confidence: number; summary: string };
  trendingTokens: string[];
};

export default function Meta() {
  const [data, setData] = useState<MetaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  function jumpToHomeWithIdea(p: MetaPreset) {
    try {
      sessionStorage.setItem(
        "roastlaunch:prefill",
        JSON.stringify({ idea: p.idea, name: p.name, ticker: p.ticker, ts: Date.now() }),
      );
    } catch {
      // ignore
    }
    setLocation("/");
  }

  useEffect(() => {
    fetch(`${API}/meta`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen scanline">
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">📊 Four.meme Meta Intelligence</h1>
          <p className="mt-2 text-zinc-400 font-mono text-sm">
            Current meta: <span className="text-orange-400 font-bold">{data?.currentMeta || "..."}</span>
          </p>
        </div>

        {loading && <div className="text-center text-zinc-500 font-mono">Loading intelligence…</div>}

        {data && (() => {
          const presets = META_PRESETS[data.currentMeta] || META_PRESETS["Degen humor"];
          return (
            <section className="mb-6 rounded-2xl border border-orange-500/40 bg-gradient-to-br from-orange-500/10 to-black p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="font-mono uppercase text-sm text-orange-400">
                  🚀 Build a coin in this meta
                </h2>
                <div className="text-[11px] font-mono text-zinc-500">
                  Tap one to pre-fill on Home
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => jumpToHomeWithIdea(p)}
                    className="px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-200 text-xs font-mono hover-elevate"
                    title={p.idea}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  onClick={() => jumpToHomeWithIdea(presets[Math.floor(Math.random() * presets.length)])}
                  className="px-3 py-1.5 rounded-full border border-orange-500/60 bg-orange-500/10 text-orange-300 text-xs font-mono hover-elevate"
                >
                  🎲 Random in this meta
                </button>
              </div>
            </section>
          );
        })()}

        {data && (
          <div className="grid md:grid-cols-2 gap-5">
            <section className="rounded-2xl border border-zinc-800 bg-black/60 p-5">
              <h2 className="font-mono uppercase text-sm text-green-400 mb-3">🏆 Winning Narratives Right Now</h2>
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={data.narratives}>
                    <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid #27272a" }} />
                    <Bar dataKey="count">
                      {data.narratives.map((n, i) => (
                        <Cell key={i} fill={n.status === "graduating" ? "#22c55e" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] font-mono text-zinc-500 mt-2">
                <span className="text-green-400">●</span> graduating &nbsp; <span className="text-red-400">●</span> rugging
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-black/60 p-5">
              <h2 className="font-mono uppercase text-sm text-orange-400 mb-3">⏰ Launch Timing Intelligence</h2>
              <div className="text-2xl font-black text-orange-400">Best hour today: {data.bestHour}:00 UTC</div>
              <div className="text-xs font-mono text-zinc-400 mb-3">Peak degen hours: 14:00–17:00 UTC</div>
              <div style={{ width: "100%", height: 160 }}>
                <ResponsiveContainer>
                  <BarChart data={data.heatmap}>
                    <XAxis dataKey="hour" tick={{ fill: "#a1a1aa", fontSize: 9 }} />
                    <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid #27272a" }} />
                    <Bar dataKey="activity" fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-black/60 p-5">
              <h2 className="font-mono uppercase text-sm text-red-400 mb-3">💀 The Graveyard</h2>
              <div className="text-xs text-zinc-500 mb-3">These ideas died this week. Learn from them.</div>
              <ul className="space-y-2">
                {data.graveyard.map((g, i) => (
                  <li key={i} className="border-l-2 border-red-500/60 pl-3">
                    <div className="text-sm text-zinc-200">💀 {g.name}</div>
                    <div className="text-[11px] font-mono text-zinc-500">{g.reason}</div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-black/60 p-5">
              <h2 className="font-mono uppercase text-sm text-purple-400 mb-3">🔮 Meta Forecast</h2>
              <div className="text-3xl font-black text-purple-300 mb-2">{data.forecast.narrative}</div>
              <div className="text-sm text-zinc-300 mb-3">{data.forecast.summary}</div>
              <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1">
                <span>Confidence</span><span>{data.forecast.confidence}%</span>
              </div>
              <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: `${data.forecast.confidence}%` }} />
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
