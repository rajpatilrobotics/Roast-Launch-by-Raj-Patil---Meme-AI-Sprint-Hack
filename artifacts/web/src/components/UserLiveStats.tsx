import { useEffect, useState } from "react";
import { API, scoreColor } from "../lib/api";

type Overall = {
  battles: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  currentStreakKind: "W" | "L" | null;
  bestWinStreak: number;
  bestScore: number;
};
type H2H = { opponent: string; wins: number; losses: number; lastBattleAt: string | null };
type Recent = {
  id: number;
  opponent: string;
  youWon: boolean;
  yourScore: number;
  theirScore: number;
  yourVerdict: string;
  reason: string;
  createdAt: string;
};
type Data = { overall: Overall; head2head: H2H[]; recent: Recent[] };

function timeAgo(iso: string) {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  const s = Math.floor(d / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function UserLiveStats({ name, isOwn }: { name: string; isOwn: boolean }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name) return;
    setLoading(true);
    fetch(`${API}/live-battle/user/${encodeURIComponent(name)}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d as Data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [name]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 mb-6 text-center text-zinc-600 font-mono text-xs">
        Loading live battle stats...
      </div>
    );
  }
  if (!data || data.overall.battles === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono uppercase text-red-300 bg-red-500/15 border border-red-500/40 rounded-full px-2 py-0.5">🔴 Live Battles</span>
        </div>
        <p className="text-zinc-500 text-xs font-mono mt-2">
          {isOwn ? "You haven't fought any live battles yet — head to Battle → Live 1v1." : `@${name} hasn't fought any live battles yet.`}
        </p>
      </div>
    );
  }

  const o = data.overall;
  const streakColor =
    o.currentStreakKind === "W" ? "text-green-400" : o.currentStreakKind === "L" ? "text-red-400" : "text-zinc-500";
  const streakLabel =
    o.currentStreakKind === "W"
      ? `🔥 ${o.currentStreak}-win streak`
      : o.currentStreakKind === "L"
      ? `💀 ${o.currentStreak}-loss streak`
      : "—";

  return (
    <div className="rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/5 via-orange-500/5 to-zinc-950 p-5 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase text-red-300 bg-red-500/15 border border-red-500/40 rounded-full px-2 py-0.5 animate-pulse">
            🔴 Live Battles
          </span>
          <span className={`text-[11px] font-mono font-bold ${streakColor}`}>{streakLabel}</span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">{o.battles} fought</span>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        <Stat label="Wins" value={o.wins} color="text-green-400" />
        <Stat label="Losses" value={o.losses} color="text-red-400" />
        <Stat
          label="Win %"
          value={`${o.winRate}%`}
          color={o.winRate >= 60 ? "text-green-400" : o.winRate >= 40 ? "text-yellow-400" : "text-red-400"}
        />
        <Stat label="Best Streak" value={`${o.bestWinStreak}W`} color="text-orange-400" />
      </div>

      {/* W/L bar */}
      <div className="mb-5">
        <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-1">
          <span>W {o.wins}</span>
          <span>L {o.losses}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden flex bg-zinc-900">
          <div className="bg-green-500/70 transition-all" style={{ width: `${o.winRate}%` }} />
          <div className="bg-red-500/70 transition-all" style={{ width: `${100 - o.winRate}%` }} />
        </div>
      </div>

      {/* Head-to-head */}
      {data.head2head.length > 0 && (
        <div className="mb-5">
          <h3 className="text-[11px] font-mono uppercase text-zinc-500 mb-2">⚔️ Head-to-Head</h3>
          <div className="space-y-1">
            {data.head2head.slice(0, 6).map((h) => {
              const total = h.wins + h.losses;
              const pct = total ? Math.round((h.wins / total) * 100) : 0;
              const dom = h.wins > h.losses ? "text-green-400" : h.wins < h.losses ? "text-red-400" : "text-zinc-400";
              return (
                <a
                  key={h.opponent}
                  href={`/u/${h.opponent}`}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 hover:border-zinc-600 transition-colors"
                >
                  <span className="font-mono text-sm text-zinc-200 truncate flex-1">@{h.opponent}</span>
                  <span className={`font-mono text-sm font-bold ${dom}`}>
                    {h.wins}<span className="text-zinc-600">-</span>{h.losses}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500 w-10 text-right">{pct}%</span>
                  <span className="font-mono text-[10px] text-zinc-600 w-14 text-right hidden sm:inline">
                    {h.lastBattleAt ? timeAgo(h.lastBattleAt) : ""}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent results */}
      {data.recent.length > 0 && (
        <div>
          <h3 className="text-[11px] font-mono uppercase text-zinc-500 mb-2">📜 Recent Live Results</h3>
          <div className="space-y-1.5">
            {data.recent.map((r) => (
              <div
                key={r.id}
                className={`rounded-lg border px-3 py-2 ${
                  r.youWon ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      r.youWon ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {r.youWon ? "WIN" : "LOSS"}
                  </span>
                  <span className="font-mono text-xs text-zinc-300">
                    vs <a className="text-orange-400 hover:underline" href={`/u/${r.opponent}`}>@{r.opponent}</a>
                  </span>
                  <span className={`font-mono text-xs font-bold ${scoreColor(r.yourScore)}`}>{r.yourScore}</span>
                  <span className="text-zinc-600 text-[10px]">vs</span>
                  <span className={`font-mono text-xs ${scoreColor(r.theirScore)}`}>{r.theirScore}</span>
                  <span className="ml-auto text-[10px] font-mono text-zinc-500">{timeAgo(r.createdAt)}</span>
                </div>
                {r.reason && (
                  <div className="text-[11px] italic text-zinc-500 mt-1 line-clamp-1">"{r.reason}"</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black/40 p-2 text-center">
      <div className={`text-2xl font-black font-mono ${color}`}>{value}</div>
      <div className="text-[9px] font-mono uppercase text-zinc-500 mt-0.5 tracking-wider">{label}</div>
    </div>
  );
}
