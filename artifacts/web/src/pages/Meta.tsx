import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toPng } from "html-to-image";
import { API } from "../lib/api";

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
  Political: [
    { label: "🇺🇸 Roast a Trump coin", idea: "Trump's hairpiece as an autonomous DAO", name: "HairDAO", ticker: "HAIR" },
    { label: "🐘 Roast a satire politico", idea: "Senator who only votes when ETH dips below 2k", name: "DipSenator", ticker: "DSEN" },
    { label: "🗳️ Roast an election meta", idea: "Token that pumps every time a politician lies on camera", name: "TruthOmeter", ticker: "LIES" },
  ],
  Anime: [
    { label: "🐱 Roast an anime girl coin", idea: "Anime catgirl who runs a yield aggregator", name: "NyaFi", ticker: "NYA" },
    { label: "🗡️ Roast a shonen token", idea: "Shonen protagonist that powers up after every dip", name: "ArcCoin", ticker: "ARC" },
    { label: "💕 Roast a waifu coin", idea: "Waifu DAO governed by anime poll voting", name: "WaifuDAO", ticker: "WAIFU" },
  ],
  "Degen humor": [
    { label: "🎰 Roast a casino coin", idea: "Token that gambles on itself every block", name: "RouletteFi", ticker: "ROUL" },
    { label: "🪦 Roast an auto-rugger", idea: "Token that auto-rugs at 100M market cap, transparently", name: "AutoExit", ticker: "EXIT" },
    { label: "🛏️ Roast a lazy yield coin", idea: "Bed that earns yield while you sleep on it", name: "SleepFi", ticker: "ZZZ" },
  ],
  Other: [
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

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function fmtCountdown(targetHourUTC: number, now: Date) {
  const target = new Date(now);
  target.setUTCHours(targetHourUTC, 0, 0, 0);
  if (target.getTime() <= now.getTime()) target.setUTCDate(target.getUTCDate() + 1);
  const diff = Math.max(0, target.getTime() - now.getTime());
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function HeatStrip({ data, currentHour }: { data: { hour: number; activity: number }[]; currentHour: number }) {
  const max = Math.max(...data.map((d) => d.activity), 1);
  return (
    <div>
      <div className="grid grid-cols-24 gap-[3px]" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
        {data.map((d) => {
          const intensity = d.activity / max;
          const isNow = d.hour === currentHour;
          const bg =
            intensity > 0.8
              ? "bg-orange-400"
              : intensity > 0.6
                ? "bg-orange-500/80"
                : intensity > 0.4
                  ? "bg-orange-600/60"
                  : intensity > 0.2
                    ? "bg-orange-700/40"
                    : "bg-zinc-800";
          return (
            <div
              key={d.hour}
              className={`relative h-10 rounded-sm ${bg} ${isNow ? "ring-2 ring-white" : ""}`}
              title={`${String(d.hour).padStart(2, "0")}:00 UTC — ${d.activity}`}
            >
              {isNow && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-white whitespace-nowrap">
                  NOW
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="grid mt-1.5 text-[9px] font-mono text-zinc-500" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
        {data.map((d) => (
          <div key={d.hour} className="text-center">
            {d.hour % 3 === 0 ? d.hour : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function NarrativeBars({
  data,
  onPick,
}: {
  data: MetaData["narratives"];
  onPick: (name: string) => void;
}) {
  const max = Math.max(...data.map((n) => n.count), 1);
  return (
    <ul className="space-y-2.5">
      {data.map((n) => {
        const pct = (n.count / max) * 100;
        const grad = n.status === "graduating";
        return (
          <li key={n.name}>
            <button
              type="button"
              onClick={() => onPick(n.name)}
              className="group w-full text-left"
              data-testid={`narrative-${n.name}`}
            >
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-zinc-200 group-hover:text-orange-300 transition-colors">
                  {grad ? "📈" : "📉"} {n.name}
                </span>
                <span className={grad ? "text-green-400" : "text-red-400"}>
                  {n.count} {grad ? "graduating" : "rugging"} →
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-zinc-900 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    grad ? "bg-gradient-to-r from-green-500 to-emerald-400" : "bg-gradient-to-r from-red-600 to-red-400"
                  } group-hover:brightness-125`}
                  style={{ width: `${Math.max(4, pct)}%` }}
                />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-800/60 ${className}`} />;
}

function SkeletonCards() {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-zinc-800 bg-black/60 p-5 space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

type AiIdea = { label: string; idea: string; name: string; ticker: string };

export default function Meta() {
  const [data, setData] = useState<MetaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const [trendModal, setTrendModal] = useState<{ narrative: string; ideas: AiIdea[] | null } | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const shareRef = useRef<HTMLDivElement | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const now = useNow(1000);

  function jumpToHomeWithIdea(p: { idea: string; name: string; ticker: string }) {
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
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function openRoastTrend(narrative: string) {
    setTrendModal({ narrative, ideas: null });
    setTrendLoading(true);
    try {
      const r = await fetch(`${API}/meta/roast-trend`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ narrative }),
      });
      const j = await r.json();
      setTrendModal({ narrative, ideas: Array.isArray(j?.ideas) ? j.ideas : [] });
    } catch {
      setTrendModal({ narrative, ideas: [] });
    } finally {
      setTrendLoading(false);
    }
  }

  async function exportShareCard() {
    if (!shareRef.current) return;
    setShareBusy(true);
    try {
      const dataUrl = await toPng(shareRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0a0a0a",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `roastlaunch-meta-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
    } catch (e) {
      console.error(e);
    } finally {
      setShareBusy(false);
    }
  }

  const presets = useMemo(() => {
    if (!data) return [];
    return META_PRESETS[data.currentMeta] || META_PRESETS["Degen humor"];
  }, [data]);

  const countdown = data ? fmtCountdown(data.bestHour, now) : "--:--:--";
  const peakNow = data ? data.heatmap[now.getUTCHours()]?.activity ?? 0 : 0;
  const peakMax = data ? Math.max(...data.heatmap.map((d) => d.activity), 1) : 1;
  const heatPct = Math.round((peakNow / peakMax) * 100);

  return (
    <div className="min-h-screen scanline">
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {/* HEADER STRIP */}
        <section className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-black to-purple-900/10 p-4 md:p-5 mb-5">
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <div className="text-3xl md:text-4xl">📊</div>
              <div>
                <div className="text-[10px] font-mono uppercase text-zinc-500">Four.meme intel</div>
                <div className="text-xl md:text-2xl font-black tracking-tight leading-none">
                  Meta Intelligence
                </div>
              </div>
            </div>

            <div className="hidden md:block w-px h-10 bg-zinc-800" />

            <div>
              <div className="text-[10px] font-mono uppercase text-zinc-500">Current meta</div>
              <div className="text-base md:text-lg font-bold text-orange-400">
                {data?.currentMeta || (loading ? "…" : "Unknown")}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-zinc-500">Peak window</div>
              <div className="font-mono text-sm">
                <span className="text-orange-400 font-bold">{data ? `${String(data.bestHour).padStart(2, "0")}:00` : "--:--"}</span>
                <span className="text-zinc-500"> UTC in </span>
                <span className="text-white font-bold tabular-nums">{countdown}</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase text-zinc-500">Right now</div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all"
                    style={{ width: `${heatPct}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-zinc-300">{heatPct}%</span>
              </div>
            </div>

            <div className="ml-auto flex gap-2">
              <button
                onClick={exportShareCard}
                disabled={!data || shareBusy}
                className="px-3 py-2 rounded-lg border border-zinc-700 hover:border-orange-500/60 text-xs font-mono uppercase hover-elevate disabled:opacity-50"
                data-testid="button-share-card"
              >
                {shareBusy ? "Rendering…" : "📸 Share card"}
              </button>
              <button
                onClick={() => presets.length && jumpToHomeWithIdea(presets[Math.floor(Math.random() * presets.length)])}
                disabled={!data}
                className="px-3 py-2 rounded-lg border border-orange-500/60 bg-orange-500/10 text-orange-300 text-xs font-mono uppercase hover-elevate disabled:opacity-50"
                data-testid="button-random-meta"
              >
                🎲 Random in meta
              </button>
            </div>
          </div>

          {/* TRENDING TICKER MARQUEE */}
          {data?.trendingTokens?.length ? (
            <div className="mt-4 -mx-4 md:-mx-5 overflow-hidden border-t border-zinc-800">
              <div className="flex gap-6 py-2 whitespace-nowrap animate-[scroll_40s_linear_infinite]">
                {[...data.trendingTokens, ...data.trendingTokens].map((t, i) => (
                  <span key={i} className="text-xs font-mono text-zinc-400">
                    <span className="text-orange-400">●</span> {t}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {/* QUICK BUILD STRIP */}
        {data && presets.length > 0 && (
          <section className="mb-5 rounded-2xl border border-zinc-800 bg-black/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <h2 className="font-mono uppercase text-xs text-orange-400">
                🚀 Build a coin in this meta
              </h2>
              <div className="text-[10px] font-mono text-zinc-500">Tap to pre-fill on Home</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => jumpToHomeWithIdea(p)}
                  className="px-3 py-1.5 rounded-full border border-zinc-700 hover:border-orange-500/60 text-zinc-200 text-xs font-mono hover-elevate"
                  title={p.idea}
                  data-testid={`preset-${p.ticker}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {loading && <SkeletonCards />}

        {data && (
          <div className="grid md:grid-cols-2 gap-5">
            <section className="rounded-2xl border border-zinc-800 bg-black/60 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-mono uppercase text-xs text-green-400">🏆 Winning Narratives</h2>
                <span className="text-[10px] font-mono text-zinc-500">click to roast →</span>
              </div>
              <NarrativeBars data={data.narratives} onPick={openRoastTrend} />
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-black/60 p-5">
              <h2 className="font-mono uppercase text-xs text-orange-400 mb-1">⏰ Launch Timing</h2>
              <div className="text-2xl font-black text-orange-400">
                Best hour: {String(data.bestHour).padStart(2, "0")}:00 UTC
              </div>
              <div className="text-[11px] font-mono text-zinc-400 mb-4">
                Peak degen hours: 14:00–17:00 UTC · countdown <span className="text-white">{countdown}</span>
              </div>
              <HeatStrip data={data.heatmap} currentHour={now.getUTCHours()} />
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-black/60 p-5">
              <h2 className="font-mono uppercase text-xs text-red-400 mb-1">💀 The Graveyard</h2>
              <div className="text-[11px] text-zinc-500 mb-3">These ideas died this week. Learn from them.</div>
              <ul className="space-y-2.5">
                {data.graveyard.map((g, i) => (
                  <li key={i} className="border-l-2 border-red-500/60 pl-3">
                    <div className="text-sm text-zinc-200 line-through decoration-red-500/50">💀 {g.name}</div>
                    <div className="text-[11px] font-mono text-zinc-500">{g.reason}</div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/10 to-black p-5">
              <h2 className="font-mono uppercase text-xs text-purple-400 mb-1">🔮 Meta Forecast (next week)</h2>
              <div className="text-3xl font-black text-purple-300 mb-2">{data.forecast.narrative}</div>
              <div className="text-sm text-zinc-300 mb-4">{data.forecast.summary}</div>
              <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-1">
                <span>Confidence</span>
                <span>{data.forecast.confidence}%</span>
              </div>
              <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-400"
                  style={{ width: `${data.forecast.confidence}%` }}
                />
              </div>
              <button
                onClick={() => openRoastTrend(data.forecast.narrative)}
                className="mt-4 w-full px-3 py-2 rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-300 text-xs font-mono uppercase hover-elevate"
                data-testid="button-roast-forecast"
              >
                🔥 Front-run this meta — generate ideas
              </button>
            </section>
          </div>
        )}

        {/* HIDDEN SHARE CARD (for export) */}
        {data && (
          <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden>
            <div
              ref={shareRef}
              style={{
                width: 1080,
                height: 1080,
                background:
                  "radial-gradient(circle at 30% 20%, rgba(249,115,22,0.25), transparent 50%), radial-gradient(circle at 80% 80%, rgba(168,85,247,0.25), transparent 50%), #0a0a0a",
                color: "white",
                padding: 64,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                display: "flex",
                flexDirection: "column",
                gap: 32,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 36, fontWeight: 900 }}>
                  <span style={{ color: "#f97316" }}>Roast</span>
                  <span style={{ color: "#22c55e" }}>Launch</span>
                  <span style={{ color: "#71717a", fontSize: 20, marginLeft: 12 }}>/v1</span>
                </div>
                <div style={{ fontSize: 18, color: "#a1a1aa" }}>
                  {new Date().toUTCString().slice(0, 16)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 20, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: 2 }}>
                  Today's meta
                </div>
                <div style={{ fontSize: 96, fontWeight: 900, color: "#f97316", lineHeight: 1 }}>
                  {data.currentMeta}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <div style={{ background: "rgba(0,0,0,0.6)", border: "1px solid #27272a", borderRadius: 16, padding: 24 }}>
                  <div style={{ color: "#a1a1aa", fontSize: 16, textTransform: "uppercase" }}>Best hour</div>
                  <div style={{ fontSize: 56, fontWeight: 900, color: "#fbbf24" }}>
                    {String(data.bestHour).padStart(2, "0")}:00 UTC
                  </div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.6)", border: "1px solid #27272a", borderRadius: 16, padding: 24 }}>
                  <div style={{ color: "#a1a1aa", fontSize: 16, textTransform: "uppercase" }}>Forecast</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: "#c4b5fd" }}>
                    {data.forecast.narrative}
                  </div>
                  <div style={{ color: "#a1a1aa", fontSize: 16, marginTop: 8 }}>
                    {data.forecast.confidence}% confidence
                  </div>
                </div>
              </div>

              <div style={{ background: "rgba(0,0,0,0.6)", border: "1px solid #27272a", borderRadius: 16, padding: 24 }}>
                <div style={{ color: "#a1a1aa", fontSize: 16, textTransform: "uppercase", marginBottom: 12 }}>
                  Top narratives
                </div>
                {data.narratives.slice(0, 4).map((n) => (
                  <div key={n.name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #18181b" }}>
                    <div style={{ fontSize: 22 }}>{n.status === "graduating" ? "📈" : "📉"} {n.name}</div>
                    <div style={{ fontSize: 22, color: n.status === "graduating" ? "#22c55e" : "#ef4444" }}>
                      {n.count} {n.status}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", color: "#71717a", fontSize: 16 }}>
                <span>roastlaunch.app</span>
                <span>built for four.meme degens</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ROAST TREND MODAL */}
      {trendModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setTrendModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-orange-500/40 bg-zinc-950 p-5 md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="text-[10px] font-mono uppercase text-zinc-500">Roast this trend</div>
                <h3 className="text-xl font-black text-orange-400">{trendModal.narrative}</h3>
              </div>
              <button
                onClick={() => setTrendModal(null)}
                className="text-zinc-500 hover:text-white text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              AI-generated coin ideas in this narrative. Tap one to launch the roast on Home.
            </p>

            {trendLoading || !trendModal.ideas ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : trendModal.ideas.length === 0 ? (
              <div className="text-sm text-red-400 font-mono">No ideas could be generated. Try another narrative.</div>
            ) : (
              <ul className="space-y-2">
                {trendModal.ideas.map((idea, i) => (
                  <li key={i}>
                    <button
                      onClick={() => {
                        jumpToHomeWithIdea({ idea: idea.idea, name: idea.name, ticker: idea.ticker });
                        setTrendModal(null);
                      }}
                      className="w-full text-left rounded-xl border border-zinc-800 hover:border-orange-500/60 bg-black/50 p-3 hover-elevate"
                      data-testid={`trend-idea-${i}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-sm text-orange-300">{idea.label}</span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {idea.name} · ${idea.ticker}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-300">{idea.idea}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
