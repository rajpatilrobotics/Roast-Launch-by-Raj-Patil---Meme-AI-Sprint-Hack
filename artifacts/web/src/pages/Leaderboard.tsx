import { useEffect, useState } from "react";
import { API, type Roast, scoreColor, verdictColor } from "../lib/api";
import { Link } from "wouter";

const HALL_SEED: Partial<Roast>[] = [
  { id: "seed-h1", tokenIdea: "Diamond-handed AI trading bot", score: 94, verdict: "WAGMI", summary: "Real utility wrapped in degen energy." },
  { id: "seed-h2", tokenIdea: "Frog that predicted every crash", score: 89, verdict: "WAGMI", summary: "Mascot fits meta, story is sticky." },
  { id: "seed-h3", tokenIdea: "Based cat that never rugs", score: 85, verdict: "WAGMI", summary: "On-meta animal + clean narrative." },
  { id: "seed-h4", tokenIdea: "Dog that pays its own gas fees", score: 82, verdict: "WAGMI", summary: "Funny + believable hook." },
  { id: "seed-h5", tokenIdea: "Sleepy bear accumulation token", score: 78, verdict: "WAGMI", summary: "Counter-meta but well-timed." },
];
const SHAME_SEED: Partial<Roast>[] = [
  { id: "seed-s1", tokenIdea: "Exact copy of PEPE but worse", score: 4, verdict: "NGMI", summary: "Zero originality, dead before launch." },
  { id: "seed-s2", tokenIdea: "Dev wallet holds 90 percent", score: 8, verdict: "NGMI", summary: "Textbook rug structure." },
  { id: "seed-s3", tokenIdea: "No website no telegram no plan", score: 11, verdict: "NGMI", summary: "Nothing to rally around." },
  { id: "seed-s4", tokenIdea: "My name token buy it now", score: 14, verdict: "NGMI", summary: "Vanity coin, no narrative." },
  { id: "seed-s5", tokenIdea: "Another dog coin nothing new", score: 17, verdict: "NGMI", summary: "Off-meta and undifferentiated." },
];

type LeaderboardUser = { userName: string; total: number; avgScore: number; roastCount: number; battleCount: number };

function CoinRow({ r, rank }: { r: Partial<Roast>; rank: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-black/40 p-3">
      <div className="text-xl font-black text-zinc-500 w-6 text-center">{rank}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-200 truncate">{r.tokenIdea}</div>
        {r.summary && <div className="text-[11px] font-mono text-zinc-500 truncate">"{r.summary}"</div>}
      </div>
      <div className={`text-2xl font-black font-mono ${scoreColor(r.score || 0)}`}>{r.score}</div>
      <div className={`px-2 py-0.5 rounded text-[10px] font-mono ${verdictColor(r.verdict || "DYOR")}`}>{r.verdict}</div>
    </div>
  );
}

const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

export default function Leaderboard() {
  const [history, setHistory] = useState<Roast[]>([]);
  const [communityLB, setCommunityLB] = useState<LeaderboardUser[]>([]);

  useEffect(() => {
    fetch(`${API}/history`).then((r) => r.json()).then((d) => setHistory(d.history || [])).catch(() => {});
    fetch(`${API}/community/leaderboard`).then((r) => r.json()).then((d) => setCommunityLB(d.leaderboard || [])).catch(() => {});
  }, []);

  const sorted = [...history].sort((a, b) => b.score - a.score);
  const realHall = sorted.filter((r) => r.score >= 70).slice(0, 5);
  const realShame = sorted.filter((r) => r.score < 40).slice(-5).reverse();
  const hall = [...realHall, ...HALL_SEED].slice(0, 5);
  const shame = [...realShame, ...SHAME_SEED].slice(0, 5);

  return (
    <div className="min-h-screen scanline">
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">🏆 Leaderboard</h1>
          <p className="mt-2 text-zinc-400 font-mono text-sm">Hall of Fame, Wall of Shame & Community Stars</p>
        </div>

        {/* Community Hall of Fame */}
        {communityLB.length > 0 && (
          <section className="mb-8">
            <h2 className="font-mono uppercase text-sm text-orange-400 mb-4">🌟 Community Hall of Fame</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {communityLB.map((u, i) => (
                <Link key={u.userName} href={`/u/${u.userName}`}>
                  <div className={`rounded-xl border p-4 cursor-pointer hover:border-orange-500/50 transition-colors ${i === 0 ? "border-yellow-500/50 bg-yellow-500/5" : i === 1 ? "border-zinc-400/40 bg-zinc-400/5" : i === 2 ? "border-orange-700/40 bg-orange-900/5" : "border-zinc-800 bg-black/30"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{MEDALS[i] || `#${i + 1}`}</span>
                      <span className="font-mono font-bold text-sm text-zinc-100 truncate">{u.userName}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      {u.total} ops · avg {u.avgScore ?? "—"}/100
                    </div>
                    <div className="text-[10px] text-zinc-600 font-mono mt-1">
                      {u.roastCount} roasts · {u.battleCount} battles
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Coin leaderboards */}
        <div className="grid md:grid-cols-2 gap-6">
          <section>
            <h2 className="font-mono uppercase text-sm text-green-400 mb-3">🏆 Hall of Fame</h2>
            <div className="space-y-2">
              {hall.map((r, i) => <CoinRow key={r.id} r={r} rank={i + 1} />)}
            </div>
          </section>
          <section>
            <h2 className="font-mono uppercase text-sm text-red-400 mb-3">💀 Wall of Shame</h2>
            <div className="space-y-2">
              {shame.map((r, i) => <CoinRow key={r.id} r={r} rank={i + 1} />)}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
