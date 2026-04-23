import { useEffect, useState } from "react";
import { API } from "../lib/api";

type Counts = { bull: number; skeptic: number; rug: number };

export default function Voting({ roastId }: { roastId: string }) {
  const [counts, setCounts] = useState<Counts>({ bull: 0, skeptic: 0, rug: 0 });
  const [voted, setVoted] = useState<keyof Counts | null>(null);

  useEffect(() => {
    setVoted((localStorage.getItem(`vote_${roastId}`) as any) || null);
    fetch(`${API}/votes/${roastId}`)
      .then((r) => r.json())
      .then((d) => setCounts(d.counts || { bull: 0, skeptic: 0, rug: 0 }))
      .catch(() => {});
  }, [roastId]);

  async function vote(kind: keyof Counts) {
    if (voted) return;
    try {
      const r = await fetch(`${API}/votes/${roastId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const d = await r.json();
      setCounts(d.counts);
      setVoted(kind);
      localStorage.setItem(`vote_${roastId}`, kind);
    } catch {}
  }

  const total = counts.bull + counts.skeptic + counts.rug;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

  const buttons: Array<{ k: keyof Counts; label: string; color: string; emoji: string; sub: string }> = [
    { k: "bull", label: "Bull", color: "border-green-500/60 text-green-400", emoji: "🐂", sub: "I'd buy this" },
    { k: "skeptic", label: "Skeptic", color: "border-blue-500/60 text-blue-400", emoji: "🧐", sub: "Needs work" },
    { k: "rug", label: "Rug", color: "border-red-500/60 text-red-400", emoji: "🚨", sub: "Stay away" },
  ];

  return (
    <section className="mt-8 rounded-2xl border border-zinc-800 bg-black/60 p-5">
      <h2 className="font-mono uppercase text-sm text-zinc-400 mb-3">
        🗳️ What does the community think? <span className="text-zinc-600">({total} votes)</span>
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {buttons.map((b) => (
          <button
            key={b.k}
            onClick={() => vote(b.k)}
            disabled={!!voted}
            className={`p-3 rounded-lg border-2 ${b.color} bg-black/50 hover-elevate text-left disabled:opacity-80 ${voted === b.k ? "ring-2 ring-current" : ""}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{b.emoji}</span>
              <div>
                <div className="font-mono text-sm font-bold">{b.label}</div>
                <div className="text-[10px] font-mono text-zinc-500">{b.sub}</div>
              </div>
            </div>
            <div className="mt-2 h-2 bg-zinc-900 rounded-full overflow-hidden">
              <div className="h-full bg-current opacity-70" style={{ width: `${pct(counts[b.k])}%` }} />
            </div>
            <div className="mt-1 text-[10px] font-mono text-zinc-400">
              {counts[b.k]} · {pct(counts[b.k])}%
            </div>
          </button>
        ))}
      </div>
      {voted && (
        <div className="mt-3 text-[11px] font-mono text-zinc-500">You voted {voted.toUpperCase()}.</div>
      )}
    </section>
  );
}
