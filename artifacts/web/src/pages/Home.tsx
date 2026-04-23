import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { API, type Roast, verdictColor, scoreColor } from "../lib/api";
import { useUser } from "../context/UserContext";
import { CHAIN } from "../lib/chain";
import Hero from "../components/Hero";
import Persona from "../components/Persona";
import Countdown from "../components/Countdown";
import Confetti from "../components/Confetti";
import Playbook from "../components/Playbook";
import MemeCards from "../components/MemeCards";
import LaunchPanel from "../components/LaunchPanel";
import TrendingFeed from "../components/TrendingFeed";
import Voting from "../components/Voting";
import TxReceipt, { type FakeTx } from "../components/TxReceipt";
import { simulateTxSubmit } from "../lib/fakeTx";
import { Sound, speak, stopSpeak, isMuted, subscribeMute } from "../lib/sounds";

const PRESETS = [
  "🐸 Frog that trades in its sleep",
  "🤖 AI agent that rugs itself",
  "🐕 Dog that pays crypto taxes",
  "🍕 Pizza that mines BNB while you eat it",
  "🧠 Italian brainrot meets DeFi yield farming",
  "👴 Boomer who just discovered crypto in 2026",
  "🦍 Ape that does its own due diligence",
  "🥩 Vegan steak coin staked by cows",
  "🐔 Chicken that lays NFT eggs every block",
  "📉 Coin that only pumps when you're asleep",
  "🪦 Token that auto-rugs at 100M market cap",
  "🛸 Alien who came to short Bitcoin",
  "🐢 Slowest meme coin — 1 tx per week",
  "🧙 Wizard that turns FUD into liquidity",
  "🎰 Casino chip that gambles on itself",
  "🦷 Tooth fairy paying out in stablecoins",
  "🍌 Banana that survived three bear markets",
  "🥷 Anonymous dev who never rugged (impossible)",
  "🛏️ Bed that earns yield while you sleep on it",
  "🦷 Wisdom teeth NFTs — limited supply, painful to mint",
  "🧻 Paper hands rewarded, diamond hands taxed",
  "🚬 Coin that quits smoking every Monday",
  "🐍 Snake that bites its own liquidity pool",
  // — Real-world relatable —
  "☕ Barista who writes 'WAGMI' on every latte",
  "🧦 Sock that mysteriously vanishes in the dryer, on-chain",
  "📦 Amazon return that comes back as an NFT",
  "🛒 Grocery cart with one wobbly wheel as governance",
  "🚗 Car that beeps until you stake your seatbelt",
  "🏋️ Gym membership that charges you for not going",
  "🛌 Snooze button that mints tokens every 9 minutes",
  "📱 Group chat that auto-mutes your in-laws",
  "🚿 Shower thoughts converted to whitepapers",
  "🧽 Sponge that absorbs market FUD",
  "🥱 Coin that pumps every time you yawn",
  "🍔 Burger flipped on-chain with proof-of-grill",
  "🪥 Toothbrush that streaks your dental NFT",
  "🐈 Cat that knocks your portfolio off the table",
  "📚 Library book returned 7 years late as a DAO proposal",
  "🥡 Leftovers that gain interest in the fridge",
  "🚦 Traffic light governed by token holders",
  "🛜 Wi-Fi router rebooted by community vote",
  "🧴 Sunscreen that only protects your ETH bag",
  "🪑 IKEA chair you assemble by staking",
  "🎤 Karaoke coin where bad singing is slashed",
  "🍦 Ice cream truck that only shows up at ATH",
  "🧩 Puzzle missing one piece — the airdrop",
  "🚲 Bike lock that demands gas to open",
  "🪴 Houseplant that dies if TVL drops",
  "📮 Letter from your future self holding bags",
  "🛗 Elevator that only stops at floors with liquidity",
  "🚪 Roommate who pays rent in vested tokens",
  "⛽ Gas station charging gwei per gallon",
  "🛋️ Couch cushions yielding lost-change rewards",
  "🧊 Ice cube that melts your slippage",
  "🍿 Microwave popcorn that pops on every block",
  "🎒 School backpack with built-in cold storage",
  "🪒 Razor that shaves a basis point per use",
  "🧯 Fire extinguisher that puts out rug fires",
  "🛞 Spare tire that only inflates in a bull run",
  "🪞 Mirror that shows your portfolio with one less zero",
  "🥤 Boba straw with 0.5% transfer tax on every sip",
  "🛁 Bathtub liquidity pool",
  "🧹 Roomba that vacuums up dust wallets",
  "🏠 Mortgage that rebases when neighbors paint their fence",
  "🦟 Mosquito DAO funded by your blood, sweat, and bags",
  "🎂 Birthday candles that mint a wish per blow",
  "🥚 Egg that hatches into a roadmap",
  "📷 Polaroid of the top, framed as an NFT",
  "🧂 Salt bae sprinkling tokenomics on your portfolio",
];

function shufflePresets(): string[] {
  const arr = [...PRESETS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 8);
}

function CountUp({ to, duration = 1500 }: { to: number; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{n}</>;
}

const JUMP_SECTIONS: { id: string; label: string; emoji: string }[] = [
  { id: "judges", label: "Judges", emoji: "🎤" },
  { id: "numbers", label: "Numbers", emoji: "📊" },
  { id: "fix", label: "Fix", emoji: "🛠️" },
  { id: "launch", label: "Launch", emoji: "🚀" },
  { id: "share", label: "Share", emoji: "🎨" },
  { id: "chain", label: "On-chain", emoji: "⛓" },
];

function JumpNav() {
  const [active, setActive] = useState<string>("judges");
  useEffect(() => {
    const els = JUMP_SECTIONS
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      aria-label="Jump to section"
      className="hidden lg:flex fixed right-5 top-1/2 -translate-y-1/2 z-30 flex-col gap-1.5 rounded-2xl border border-zinc-800 bg-black/70 backdrop-blur p-2 shadow-xl"
    >
      {JUMP_SECTIONS.map((s) => {
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            onClick={() => jump(s.id)}
            title={s.label}
            className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-mono text-[11px] transition-all ${
              isActive
                ? "bg-orange-500/20 text-orange-300 border border-orange-500/50"
                : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent"
            }`}
          >
            <span className="text-sm leading-none">{s.emoji}</span>
            <span className="uppercase tracking-wider">{s.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function CompareTile({ label, before, after, delta, suffix = "", lowerIsBetter = false }: { label: string; before: number; after: number; delta: number; suffix?: string; lowerIsBetter?: boolean }) {
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const same = delta === 0;
  const deltaColor = same ? "text-zinc-500" : improved ? "text-green-400" : "text-red-400";
  const sign = delta > 0 ? "+" : "";
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/50 p-4">
      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">{label}</div>
      <div className="flex items-end gap-2">
        <div className="text-zinc-500 line-through font-mono text-lg">{before}{suffix}</div>
        <div className="text-zinc-600 text-lg">→</div>
        <div className="text-zinc-100 font-black font-mono text-2xl">{after}{suffix}</div>
      </div>
      <div className={`mt-1 font-mono text-xs font-bold ${deltaColor}`}>
        {same ? "no change" : `${sign}${delta}${suffix} ${improved ? "✓" : ""}`}
      </div>
    </div>
  );
}

function CompareRow({ label, before, after, delta, max }: { label: string; before: number; after: number; delta: number; max: number }) {
  const improved = delta > 0;
  const same = delta === 0;
  const deltaColor = same ? "text-zinc-500" : improved ? "text-green-400" : "text-red-400";
  const sign = delta > 0 ? "+" : "";
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-400 uppercase">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-zinc-500 line-through tabular-nums">{before}/{max}</span>
        <span className="text-zinc-600">→</span>
        <span className="text-zinc-100 font-bold tabular-nums">{after}/{max}</span>
        <span className={`tabular-nums w-12 text-right ${deltaColor}`}>{same ? "·" : `${sign}${delta}`}</span>
      </div>
    </div>
  );
}

function SectionHeader({ step, title, subtitle, muted = false }: { step?: string; title: string; subtitle?: string; muted?: boolean }) {
  return (
    <div className="mb-3 flex items-baseline gap-3">
      {step && (
        <span className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full font-mono text-[11px] font-bold ${muted ? "bg-zinc-900 text-zinc-500 border border-zinc-800" : "bg-orange-500/15 text-orange-300 border border-orange-500/40"}`}>
          {step}
        </span>
      )}
      <div className="min-w-0">
        <h2 className={`text-base sm:text-lg font-black tracking-tight ${muted ? "text-zinc-400" : "text-zinc-100"}`}>{title}</h2>
        {subtitle && <p className="text-[11px] font-mono text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function Bar({ label, value, max = 25, color = "from-green-500 to-orange-400" }: { label: string; value: number; max?: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs font-mono uppercase mb-1 text-zinc-400">
        <span>{label}</span>
        <span className="text-zinc-200">{value}/{max}</span>
      </div>
      <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Home() {
  const [tokenIdea, setTokenIdea] = useState("");
  const [visiblePresets, setVisiblePresets] = useState<string[]>(() => shufflePresets());
  const [tokenName, setTokenName] = useState("");
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(false);
  const [pending, setPending] = useState<Promise<Roast> | null>(null);
  const [roast, setRoast] = useState<Roast | null>(null);
  const [showConfetti, setShowConfetti] = useState<null | "wagmi" | "ngmi" | "dyor">(null);
  const [history, setHistory] = useState<Roast[]>([]);
  const [trending, setTrending] = useState<{ tokens: string[]; meta: string }>({ tokens: [], meta: "..." });
  const [chainSaving, setChainSaving] = useState(false);
  const [tx, setTx] = useState<FakeTx | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachResult, setCoachResult] = useState<{ original: Roast; improved: Roast; delta: { score: number; rugProbability: number; graduationProbability: number; narrative: number; community: number; timing: number; risk: number } } | null>(null);
  const [coachError, setCoachError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { userName } = useUser();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("roastlaunch:prefill");
      if (raw) {
        sessionStorage.removeItem("roastlaunch:prefill");
        const p = JSON.parse(raw);
        if (p && typeof p.idea === "string") {
          setTokenIdea(p.idea);
          if (typeof p.name === "string") setTokenName(p.name);
          if (typeof p.ticker === "string") setTicker(p.ticker);
          setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight * 0.3, behavior: "smooth" });
          }, 100);
        }
      }
      const remixRaw = sessionStorage.getItem("roastlaunch:remixResult");
      if (remixRaw) {
        sessionStorage.removeItem("roastlaunch:remixResult");
        const r = JSON.parse(remixRaw);
        if (r && r.score !== undefined) {
          setRoast(r as Roast);
          setTimeout(() => window.scrollTo({ top: document.body.scrollHeight * 0.4, behavior: "smooth" }), 200);
        }
      }
    } catch {
      // ignore
    }
    fetch(`${API}/trending`).then((r) => r.json()).then(setTrending).catch(() => {});
    fetch(`${API}/history`).then((r) => r.json()).then((d) => setHistory(d.history || [])).catch(() => {});
    const id = setInterval(() => {
      fetch(`${API}/trending`).then((r) => r.json()).then(setTrending).catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  async function saveOnChain() {
    if (!roast || chainSaving) return;
    setChainSaving(true);
    try {
      const fake = await simulateTxSubmit();
      setTx(fake);
      setRoast({ ...roast, txHash: fake.hash });
      fetch(`${API}/history/txhash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: roast.id, txHash: fake.hash }),
      }).catch(() => {});
    } finally {
      setChainSaving(false);
    }
  }

  function startRoast() {
    if (!tokenIdea.trim() || loading) return;
    setLoading(true);
    setRoast(null);
    setShowConfetti(null);
    setCountdown(true);
    setCoachResult(null);
    setCoachError(null);
    const p = (async () => {
      const r = await fetch(`${API}/roast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenIdea, tokenName, ticker, userName: userName || undefined }),
      });
      const txt = await r.text();
      if (!txt) throw new Error(`Empty response from server (HTTP ${r.status})`);
      try {
        return JSON.parse(txt) as Roast;
      } catch {
        throw new Error(`Invalid JSON from server: ${txt.slice(0, 120)}`);
      }
    })();
    setPending(p);
  }

  async function runCoach() {
    if (!roast || coachLoading) return;
    setCoachLoading(true);
    setCoachError(null);
    setCoachResult(null);
    try {
      const r = await fetch(`${API}/roast/coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalRoast: roast, userName: userName || undefined }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Coach failed");
      setCoachResult(data);
      setHistory((h) => [data.improved, ...h.filter((x) => x.id !== data.improved.id)].slice(0, 10));
      setTimeout(() => {
        document.getElementById("coach-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    } catch (e: any) {
      setCoachError(e?.message || "Something went wrong");
    } finally {
      setCoachLoading(false);
    }
  }

  function applyCoachAsCurrent() {
    if (!coachResult) return;
    setRoast(coachResult.improved);
    setCoachResult(null);
    setShowConfetti(coachResult.improved.verdict === "WAGMI" ? "wagmi" : coachResult.improved.verdict === "NGMI" ? "ngmi" : "dyor");
    setTimeout(() => setShowConfetti(null), 2400);
    document.getElementById("numbers")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function onCountdownDone() {
    setCountdown(false);
    try {
      const data = await pending!;
      setRoast(data);
      setHistory((h) => [data, ...h.filter((x) => x.id !== data.id)].slice(0, 10));
      const kind = data.verdict === "WAGMI" ? "wagmi" : data.verdict === "NGMI" ? "ngmi" : "dyor";
      setShowConfetti(kind);
      // Verdict sound + body shake on NGMI
      if (kind === "wagmi") Sound.wagmi();
      else if (kind === "ngmi") {
        Sound.ngmi();
        document.body.classList.add("body-shake");
        setTimeout(() => document.body.classList.remove("body-shake"), 700);
      } else Sound.dyor();
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e: any) {
      alert("Roast failed: " + (e.message || e));
    } finally {
      setLoading(false);
      setPending(null);
    }
  }

  const [speaking, setSpeaking] = useState(false);
  const [, setMuteTick] = useState(0);
  useEffect(() => subscribeMute(() => setMuteTick((n) => n + 1)), []);

  function speakRoast() {
    if (!roast) return;
    if (speaking) {
      stopSpeak();
      setSpeaking(false);
      return;
    }
    if (isMuted()) return;
    const verdictLine =
      roast.verdict === "WAGMI"
        ? "Verdict: WAGMI. This coin might actually make it."
        : roast.verdict === "NGMI"
          ? "Verdict: NGMI. This coin is dead on arrival."
          : "Verdict: DYOR. Needs work but has potential.";
    const script = `Roast Launch panel. The Bull says: ${roast.bull} ... The Skeptic says: ${roast.skeptic} ... Rug Detector says: ${roast.rug} ... Final Survive Score: ${roast.score} out of one hundred. ${verdictLine}`;
    setSpeaking(true);
    speak(script);
    const id = setInterval(() => {
      if (!window.speechSynthesis?.speaking) {
        clearInterval(id);
        setSpeaking(false);
      }
    }, 400);
  }

  async function downloadCard() {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        backgroundColor: "#050505",
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `roastlaunch-${roast?.score || 0}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("downloadCard failed:", err);
      alert("Could not generate card. Try again.");
    }
  }

  function shareOnX() {
    if (!roast) return;
    const text = `Just roasted ${roast.tokenName || "my meme coin idea"} on RoastLaunch 🔥 Survive Score: ${roast.score}/100 — ${roast.verdict}. ${roast.summary} #RoastLaunch #FourMeme #BNBChain`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  }

  const tickerItems = trending.tokens.length > 0 ? trending.tokens : ["loading trending..."];

  const verdictBigClass =
    roast?.verdict === "WAGMI"
      ? "text-green-400 flash-green"
      : roast?.verdict === "NGMI"
        ? "text-red-400 flash-red shake"
        : "text-orange-400";

  return (
    <div className="min-h-screen scanline">
      {countdown && <Countdown onDone={onCountdownDone} />}
      {showConfetti && <Confetti kind={showConfetti} onDone={() => setShowConfetti(null)} />}

      <Hero />

      {/* Sticky meta + ticker */}
      <div className="sticky top-[57px] z-20 border-b border-orange-500/20 bg-black/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-2 flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-mono text-orange-300 whitespace-nowrap">
            🔥 Hot meta: <span className="font-bold text-orange-400">{trending.meta}</span>
          </span>
          <div className="flex-1 overflow-hidden">
            <div className="ticker-track inline-flex gap-8 whitespace-nowrap text-xs font-mono text-green-400">
              {[...tickerItems, ...tickerItems].map((t, i) => (
                <span key={i}>${t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Input */}
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        <SectionHeader step="1" title="Pitch your meme coin" subtitle="One line. Free. ~30 seconds. No wallet needed." />
        <div className="rounded-2xl border-2 border-orange-500/40 bg-black/60 p-5 md:p-6 glow-orange">
          <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
            <label className="block text-xs font-mono uppercase text-orange-400">Your idea</label>
            <span className="text-[10px] font-mono text-zinc-500">⚡ free · ~30 sec</span>
          </div>
          <textarea
            value={tokenIdea}
            onChange={(e) => setTokenIdea(e.target.value)}
            placeholder="a frog that trades crypto in its sleep..."
            rows={2}
            className="w-full bg-black/60 border border-zinc-800 rounded-lg p-3 text-base focus:outline-none focus:border-orange-500 resize-none"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => {
                const p = PRESETS[Math.floor(Math.random() * PRESETS.length)];
                setTokenIdea(p.replace(/^\S+\s/, ""));
              }}
              className="px-3 py-1.5 rounded-full border border-orange-500/60 bg-orange-500/10 text-orange-300 text-xs font-mono hover-elevate"
              title="Pick a random hilarious idea"
            >
              🎲 Surprise me
            </button>
            <button
              onClick={() => setVisiblePresets(shufflePresets())}
              className="px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-400 text-xs font-mono hover-elevate"
              title="Shuffle suggestions"
            >
              🔀 Shuffle
            </button>
            {visiblePresets.map((p) => (
              <button
                key={p}
                onClick={() => setTokenIdea(p.replace(/^\S+\s/, ""))}
                className="px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-300 text-xs font-mono hover-elevate"
              >
                {p}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <input value={tokenName} onChange={(e) => setTokenName(e.target.value)} placeholder="Token name (optional)" className="bg-black/60 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-orange-500" />
            <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="TICKER (optional)" className="bg-black/60 border border-zinc-800 rounded-lg p-3 text-sm font-mono focus:outline-none focus:border-orange-500" />
          </div>
          <button
            onClick={startRoast}
            disabled={loading || !tokenIdea.trim()}
            className="mt-4 w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-green-500 text-black font-black text-lg uppercase tracking-wider disabled:opacity-50 hover:scale-[1.01] transition"
          >
            {loading ? "🔥 Roasting..." : "🔥 Roast My Coin"}
          </button>
        </div>

        <div ref={resultsRef} />

        {/* Step 2 · Judges */}
        {(loading || roast) && (
          <section id="judges" className="mt-10 scroll-mt-24">
            <SectionHeader step="2" title="Meet the AI judges" subtitle="Three personas roast your pitch — bullish, skeptical, and on-chain." />
            <div className="grid md:grid-cols-3 gap-4">
              <Persona title="The Bull" subtitle="Degen optimist" emoji="🐂" color="border-green-500/60" glow="glow-green" meterColor="bg-green-500" text={roast?.bull || ""} loading={loading} />
              <Persona title="The Skeptic" subtitle="CT analyst" emoji="🧐" color="border-blue-500/60" glow="glow-blue" meterColor="bg-blue-500" text={roast?.skeptic || ""} loading={loading} />
              <Persona title="Rug Detector" subtitle="On-chain analyst" emoji="🚨" color="border-red-500/60" glow="glow-red" meterColor="bg-red-500" text={roast?.rug || ""} loading={loading} />
            </div>
          </section>
        )}

        {/* Verdict */}
        {roast && (
          <div className={`mt-8 rounded-2xl border-2 p-6 ${verdictColor(roast.verdict).split(" ").slice(1).join(" ")} ${verdictBigClass}`}>
            <div className="text-center">
              <div className={`text-7xl md:text-9xl font-black font-mono ${scoreColor(roast.score)}`}>
                <CountUp to={roast.score} />
                <span className="text-3xl text-zinc-600">/100</span>
              </div>
              <div
                className={`mt-3 text-2xl md:text-4xl font-black tracking-wider ${scoreColor(roast.score)} verdict-stamp`}
              >
                {roast.verdict === "WAGMI" && "🎉 YOUR COIN MIGHT ACTUALLY MAKE IT"}
                {roast.verdict === "DYOR" && "⚠️ NEEDS WORK BUT HAS POTENTIAL"}
                {roast.verdict === "NGMI" && "💀 THIS COIN IS DEAD ON ARRIVAL"}
              </div>
              <div className="mt-3 text-zinc-300 italic">"{roast.summary}"</div>
              <div className="mt-4 flex justify-center">
                <button
                  onClick={speakRoast}
                  disabled={isMuted()}
                  title={isMuted() ? "Unmute first (top right)" : speaking ? "Stop voice" : "Hear the AI read your roast"}
                  className="px-4 py-2 rounded-full border border-orange-500/60 bg-orange-500/10 text-orange-300 font-mono text-xs hover-elevate disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {speaking ? "⏹ Stop voice" : "🎙️ Hear the roast"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === RESULT — clean stepped flow === */}
        {roast && <JumpNav />}
        {roast && (
          <div className="space-y-10 mt-10">

            {/* Step 3 · Numbers */}
            <section id="numbers" className="scroll-mt-24">
              <SectionHeader step="3" title="The numbers" subtitle="How your idea scored across four dimensions." />
              <div className="rounded-2xl border border-zinc-800 bg-black/60 p-6 space-y-6">
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                  <Bar label="Narrative" value={roast.narrative} />
                  <Bar label="Community" value={roast.community} />
                  <Bar label="Timing" value={roast.timing} />
                  <Bar label="Risk" value={roast.risk} />
                </div>

                <div className="grid sm:grid-cols-2 gap-6 pt-2 border-t border-zinc-900">
                  <div>
                    <div className="flex justify-between text-xs font-mono uppercase mb-1">
                      <span className="text-red-400">☠️ Rug Probability</span>
                      <span className={`${roast.rugProbability >= 60 ? "text-red-400 animate-pulse" : "text-zinc-200"}`}>{roast.rugProbability}%</span>
                    </div>
                    <div className="h-2.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div className={`h-full ${roast.rugProbability >= 60 ? "bg-red-500 animate-pulse" : "bg-orange-500"}`} style={{ width: `${roast.rugProbability}%` }} />
                    </div>
                    {roast.rugProbability >= 60 && (
                      <div className="mt-1 text-[11px] font-mono text-red-400">⚠️ High rug risk — fix before launching.</div>
                    )}
                  </div>

                  <div data-testid="graduation-probability">
                    <div className="flex justify-between text-xs font-mono uppercase mb-1">
                      <span className="text-purple-300">🎓 Graduation Probability</span>
                      <span className={`${roast.graduationProbability >= 60 ? "text-purple-300" : "text-zinc-200"}`}>{roast.graduationProbability}%</span>
                    </div>
                    <div className="h-2.5 bg-zinc-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${roast.graduationProbability >= 60 ? "bg-gradient-to-r from-purple-500 to-pink-400" : "bg-purple-500/60"}`}
                        style={{ width: `${roast.graduationProbability}%` }}
                      />
                    </div>
                    {roast.graduationReason && (
                      <div className="mt-1 text-[11px] font-mono text-purple-300/80 line-clamp-2">{roast.graduationReason}</div>
                    )}
                  </div>
                </div>

                <div className="text-xs font-mono pt-2 border-t border-zinc-900">
                  {roast.fitsMeta ? (
                    <span className="text-green-400">✅ Fits current meta ({roast.hotMeta})</span>
                  ) : (
                    <span className="text-orange-400">⚠️ Off-meta — harder to trend right now (hot: {roast.hotMeta})</span>
                  )}
                </div>
              </div>
            </section>

            {/* Step 4 · Recovery plan */}
            <section id="fix" className="scroll-mt-24">
              <SectionHeader step="4" title="Fix it before you launch" subtitle="Specific, concrete tweaks the AI thinks will move your score." />
              <div className="rounded-2xl border border-zinc-800 bg-black/60 p-6">
                <ul className="space-y-2 text-sm text-zinc-200">
                  {roast.fixedBrief.map((b, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-green-400 mt-0.5">→</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 pt-5 border-t border-zinc-900 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                  <div className="text-[11px] font-mono text-zinc-500 max-w-md">
                    🤖 <span className="text-zinc-300">AI Coach:</span> Auto-apply these suggestions and re-score to see how much your idea improves.
                  </div>
                  <button
                    onClick={runCoach}
                    disabled={coachLoading}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-sm hover-elevate disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
                    data-testid="button-coach"
                  >
                    {coachLoading ? "🤖 Re-roasting..." : "✨ Apply fixes & re-roast"}
                  </button>
                </div>
                {coachError && (
                  <div className="mt-3 text-xs font-mono text-red-400">⚠️ {coachError}</div>
                )}
              </div>

              {coachResult && (
                <div id="coach-result" className="mt-6 rounded-2xl border-2 border-purple-500/50 bg-gradient-to-br from-purple-950/40 via-black to-pink-950/30 p-6 scroll-mt-24" data-testid="coach-result">
                  <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                    <div>
                      <div className="text-[11px] font-mono uppercase tracking-wider text-purple-300">🤖 AI Coach result</div>
                      <h3 className="text-lg font-black text-zinc-100 mt-0.5">Before vs. after applying the fixes</h3>
                    </div>
                    <button
                      onClick={applyCoachAsCurrent}
                      className="px-4 py-2 rounded-lg bg-purple-500 text-white font-mono text-xs font-bold hover:bg-purple-400"
                      data-testid="button-coach-apply"
                    >
                      ✅ Use the improved version →
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4 mb-5">
                    <CompareTile label="Score" before={coachResult.original.score} after={coachResult.improved.score} delta={coachResult.delta.score} suffix="/100" />
                    <CompareTile label="Rug %" before={coachResult.original.rugProbability} after={coachResult.improved.rugProbability} delta={coachResult.delta.rugProbability} suffix="%" lowerIsBetter />
                    <CompareTile label="Graduation %" before={coachResult.original.graduationProbability} after={coachResult.improved.graduationProbability} delta={coachResult.delta.graduationProbability} suffix="%" />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mb-5 text-xs font-mono">
                    <CompareRow label="Narrative" before={coachResult.original.narrative} after={coachResult.improved.narrative} delta={coachResult.delta.narrative} max={25} />
                    <CompareRow label="Community" before={coachResult.original.community} after={coachResult.improved.community} delta={coachResult.delta.community} max={25} />
                    <CompareRow label="Timing" before={coachResult.original.timing} after={coachResult.improved.timing} delta={coachResult.delta.timing} max={25} />
                    <CompareRow label="Risk" before={coachResult.original.risk} after={coachResult.improved.risk} delta={coachResult.delta.risk} max={25} />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-zinc-800 bg-black/40 p-3">
                      <div className="font-mono uppercase text-[10px] text-zinc-500 mb-1">Before — verdict</div>
                      <div className={`font-bold ${verdictColor(coachResult.original.verdict).split(" ")[0]}`}>{coachResult.original.verdict}</div>
                      <div className="text-zinc-400 mt-1 italic line-clamp-3">"{coachResult.original.summary}"</div>
                    </div>
                    <div className="rounded-lg border border-purple-500/40 bg-purple-500/5 p-3">
                      <div className="font-mono uppercase text-[10px] text-purple-300 mb-1">After — verdict</div>
                      <div className={`font-bold ${verdictColor(coachResult.improved.verdict).split(" ")[0]}`}>{coachResult.improved.verdict}</div>
                      <div className="text-zinc-300 mt-1 italic line-clamp-3">"{coachResult.improved.summary}"</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6">
                <Playbook plan={roast.sevenDayPlan} />
              </div>
            </section>

            {/* Step 5 · Launch */}
            <section id="launch" className="scroll-mt-24">
              <SectionHeader step="5" title="Launch on Four.meme" subtitle="Pre-flight checklist + one-tap launch with autofilled details." />
              <LaunchPanel
                roast={roast}
                onLaunchedConfetti={() => setShowConfetti("wagmi")}
              />
            </section>

            {/* Step 6 · Share */}
            <section id="share" className="scroll-mt-24">
              <SectionHeader step="6" title="Make it shareable" subtitle="Memes, a downloadable card, and one-click share to X." />
              <div className="space-y-6">
                <div className="max-w-md mx-auto w-full space-y-3">
                  <div ref={cardRef} className="rounded-2xl p-6 bg-gradient-to-br from-zinc-900 to-black border-2 border-green-500/40" style={{ minHeight: 460 }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-black text-lg">
                        <span className="text-orange-400">Roast</span><span className="text-green-400">Launch</span>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-[10px] font-mono ${verdictColor(roast.verdict)}`}>{roast.verdict}</div>
                    </div>
                    <div className="text-zinc-300 text-sm mb-2">"{roast.tokenIdea}"</div>
                    {roast.ticker && <div className="font-mono text-xs text-orange-400 mb-3">${roast.ticker}</div>}
                    <div className={`text-center text-6xl font-black font-mono my-4 ${scoreColor(roast.score)}`}>
                      {roast.score}<span className="text-2xl text-zinc-600">/100</span>
                    </div>
                    <div className="text-zinc-300 text-xs italic text-center mb-2">"{roast.summary}"</div>
                    <div className="text-center text-[11px] font-mono text-red-400 mb-3">☠️ Rug Probability: {roast.rugProbability}%</div>
                    <div className="space-y-2 text-xs">
                      <div className="border-l-2 border-green-500 pl-2 text-zinc-300">
                        <span className="text-green-400 font-mono">🐂 BULL: </span>{roast.bull.slice(0, 110)}…
                      </div>
                      <div className="border-l-2 border-red-500 pl-2 text-zinc-300">
                        <span className="text-red-400 font-mono">🚨 RUG: </span>{roast.rug.slice(0, 110)}…
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between text-[10px] font-mono text-zinc-500">
                      <span>{roast.txHash ? `BSC: ${roast.txHash.slice(-8)}` : "off-chain"}</span>
                      <span>roastlaunch · {new Date(roast.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={downloadCard} className="py-3 rounded-lg border border-green-500/60 text-green-400 font-mono text-sm hover-elevate">⬇ Download Card</button>
                    <button onClick={shareOnX} className="py-3 rounded-lg bg-white text-black font-mono text-sm hover:bg-zinc-200">𝕏 Share on X</button>
                  </div>
                </div>
                <MemeCards tokenName={roast.tokenName || roast.ticker || "YOUR COIN"} memeTexts={roast.memeTexts} />
              </div>
              <div className="mt-6">
                <Voting roastId={roast.id} />
              </div>
            </section>

            {/* Step 7 · On-chain proof (subtle) */}
            <section id="chain" className="scroll-mt-24">
              <SectionHeader step="7" title="Prove it on-chain" subtitle="Optional — anchor this roast permanently to BNB Chain." muted />
              <div className="rounded-2xl border border-zinc-800 bg-black/40 p-5">
                {tx ? (
                  <TxReceipt tx={tx} />
                ) : chainSaving ? (
                  <div className="flex items-center gap-3" data-testid="tx-submitting">
                    <div className="w-9 h-9 rounded-full border-2 border-orange-500/30 border-t-orange-400 animate-spin shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-bold text-orange-300">Submitting transaction...</div>
                      <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                        Broadcasting to {CHAIN.label}
                      </div>
                      <div className="mt-2 h-1 w-full overflow-hidden rounded bg-zinc-900">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-green-400"
                          style={{ animation: "txbar 2.5s ease-in-out infinite" }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-[11px] font-mono text-zinc-500">
                      Permanently anchor this roast to {CHAIN.label}.
                    </div>
                    <button
                      onClick={saveOnChain}
                      disabled={chainSaving}
                      className="px-4 py-2 rounded-lg border border-orange-500/60 text-orange-400 font-mono text-xs hover-elevate disabled:opacity-50"
                      data-testid="button-save-onchain"
                    >
                      💾 Save on-chain
                    </button>
                  </div>
                )}
              </div>
            </section>

          </div>
        )}

        <TrendingFeed />

        {/* History feed */}
        <section className="mt-12">
          <h2 className="font-mono uppercase text-sm text-zinc-400 mb-3">🔥 Recent Roasts</h2>
          <div className="space-y-2">
            {history.length === 0 && <div className="text-zinc-600 text-sm font-mono">No roasts yet. Be the first.</div>}
            {history.map((h) => (
              <div key={h.id} className="rounded-lg border border-zinc-800 bg-black/40 p-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-200 truncate">{h.tokenIdea}</div>
                  <div className="text-[10px] font-mono text-zinc-500">{new Date(h.timestamp).toLocaleString()} · ☠ {h.rugProbability ?? 50}%</div>
                </div>
                <div className={`text-lg font-black font-mono ${scoreColor(h.score)}`}>{h.score}</div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-mono ${verdictColor(h.verdict)}`}>{h.verdict}</div>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-16 mb-8 text-center text-xs font-mono text-zinc-600 space-y-1">
          <div>Built for Four.meme AI Sprint · $50K Hackathon · BNB Chain</div>
          <div>Stress-test your meme coin before it dies.</div>
        </footer>
      </main>
    </div>
  );
}
