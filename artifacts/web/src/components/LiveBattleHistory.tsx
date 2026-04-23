import { useEffect, useState } from "react";
import { API, scoreColor, verdictColor, type Roast } from "../lib/api";

type Coin = { tokenIdea?: string; tokenName?: string; ticker?: string };
type LiveResult = {
  a: Roast;
  b: Roast;
  winner: "A" | "B";
  reason: string;
  winnerUser: string;
  loserUser: string;
  winnerRoast: Roast;
  loserRoast: Roast;
};
type Battle = {
  id: number;
  hostUser: string;
  opponentUser: string;
  status: string;
  hostCoin: Coin | null;
  opponentCoin: Coin | null;
  result: LiveResult | null;
  createdAt: string;
};

type LBRow = {
  userName: string;
  wins: number;
  losses: number;
  battles: number;
  winRate: number;
  bestScore: number;
  lastBattle: string | null;
};

const MEDALS = ["🥇", "🥈", "🥉"];

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  const s = Math.floor(d / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

export default function LiveBattleHistory({ currentUser }: { currentUser?: string | null }) {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [leaderboard, setLeaderboard] = useState<LBRow[]>([]);
  const [totalBattles, setTotalBattles] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const [tab, setTab] = useState<"recent" | "warriors">("recent");

  useEffect(() => {
    let alive = true;
    const load = () => {
      Promise.all([
        fetch(`${API}/live-battle/history?limit=30`).then((r) => r.json()),
        fetch(`${API}/live-battle/leaderboard`).then((r) => r.json()),
      ])
        .then(([h, l]) => {
          if (!alive) return;
          setBattles(h.battles || []);
          setLeaderboard(l.leaderboard || []);
          setTotalBattles(l.totalBattles || 0);
          setLoading(false);
        })
        .catch(() => alive && setLoading(false));
    };
    load();
    const id = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            <span className="text-red-400">🔴 Live Battle</span>
            <span className="text-zinc-300"> Archive</span>
          </h2>
          <p className="text-zinc-500 text-xs font-mono mt-0.5">
            {totalBattles} battles fought · refreshing every 15s
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setTab("recent")}
            className={`px-3 py-1.5 rounded-lg font-mono text-[11px] uppercase tracking-wider border transition-colors ${
              tab === "recent"
                ? "bg-red-500/20 border-red-500/50 text-red-300"
                : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            ⚔️ Recent
          </button>
          <button
            onClick={() => setTab("warriors")}
            className={`px-3 py-1.5 rounded-lg font-mono text-[11px] uppercase tracking-wider border transition-colors ${
              tab === "warriors"
                ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
                : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            🏆 Top Warriors
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-zinc-600 font-mono text-sm text-center py-12">Loading battle archive...</div>
      )}

      {!loading && tab === "warriors" && (
        <div className="rounded-2xl border border-zinc-800 bg-black/40 overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="text-zinc-600 text-sm text-center py-10 font-mono">
              No live battles yet — be the first to start one above.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-[10px] uppercase font-mono text-zinc-500">
                <tr>
                  <th className="text-left py-2.5 px-3 w-10">#</th>
                  <th className="text-left py-2.5 px-3">Warrior</th>
                  <th className="text-center py-2.5 px-2">W</th>
                  <th className="text-center py-2.5 px-2 hidden sm:table-cell">L</th>
                  <th className="text-center py-2.5 px-2">Win %</th>
                  <th className="text-center py-2.5 px-2 hidden md:table-cell">Best</th>
                  <th className="text-right py-2.5 px-3 hidden md:table-cell">Last</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((u, i) => {
                  const me = currentUser === u.userName;
                  return (
                    <tr
                      key={u.userName}
                      className={`border-t border-zinc-900 ${
                        me ? "bg-orange-500/5" : i < 3 ? "bg-yellow-500/5" : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-zinc-500">{MEDALS[i] || i + 1}</td>
                      <td className="py-2.5 px-3 font-mono text-zinc-100 truncate max-w-[140px]">
                        @{u.userName} {me && <span className="text-[10px] text-orange-400">(you)</span>}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-black text-green-400">{u.wins}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-red-400 hidden sm:table-cell">{u.losses}</td>
                      <td className="py-2.5 px-2 text-center font-mono">
                        <span className={u.winRate >= 60 ? "text-green-400" : u.winRate >= 40 ? "text-yellow-400" : "text-red-400"}>
                          {u.winRate}%
                        </span>
                      </td>
                      <td className={`py-2.5 px-2 text-center font-mono font-bold hidden md:table-cell ${scoreColor(u.bestScore)}`}>
                        {u.bestScore}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[11px] font-mono text-zinc-500 hidden md:table-cell">
                        {u.lastBattle ? timeAgo(u.lastBattle) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!loading && tab === "recent" && (
        <div className="space-y-3">
          {battles.length === 0 ? (
            <div className="text-zinc-600 text-sm text-center py-10 font-mono rounded-2xl border border-zinc-800 bg-black/40">
              No completed battles yet — challenge someone above!
            </div>
          ) : (
            battles.map((b) => <BattleCard key={b.id} b={b} open={openId === b.id} onToggle={() => setOpenId(openId === b.id ? null : b.id)} />)
          )}
        </div>
      )}
    </section>
  );
}

function BattleCard({ b, open, onToggle }: { b: Battle; open: boolean; onToggle: () => void }) {
  const r = b.result;
  if (!r) return null;
  return (
    <div className="rounded-xl border border-zinc-800 bg-gradient-to-br from-black/60 to-zinc-950/60 overflow-hidden">
      <button onClick={onToggle} className="w-full text-left p-4 hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/40 text-red-300">
            🔴 LIVE
          </span>
          <span className="text-[11px] font-mono text-zinc-500">{timeAgo(b.createdAt)}</span>
          <span className="ml-auto text-zinc-600 text-xs font-mono">{open ? "▲" : "▼"}</span>
        </div>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className={`font-bold font-mono ${r.winner === "A" ? "text-yellow-400" : "text-zinc-500 line-through"}`}>
            @{b.hostUser}
          </span>
          <span className={`text-xs font-mono ${scoreColor(r.a.score)}`}>{r.a.score}</span>
          <span className="text-zinc-600 font-mono">vs</span>
          <span className={`font-bold font-mono ${r.winner === "B" ? "text-yellow-400" : "text-zinc-500 line-through"}`}>
            @{b.opponentUser}
          </span>
          <span className={`text-xs font-mono ${scoreColor(r.b.score)}`}>{r.b.score}</span>
          <span className="ml-auto text-[11px] font-mono text-yellow-300">
            🏆 @{r.winnerUser}
          </span>
        </div>
        <div className="mt-1.5 text-zinc-400 text-xs italic truncate">"{r.reason}"</div>
      </button>

      {open && (
        <div className="border-t border-zinc-800 p-4 grid md:grid-cols-2 gap-3">
          <SideCard side="A" user={b.hostUser} coin={b.hostCoin} roast={r.a} won={r.winner === "A"} />
          <SideCard side="B" user={b.opponentUser} coin={b.opponentCoin} roast={r.b} won={r.winner === "B"} />
        </div>
      )}
    </div>
  );
}

function SideCard({ user, coin, roast, won }: { side: "A" | "B"; user: string; coin: Coin | null; roast: Roast; won: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${won ? "border-yellow-500/60 bg-yellow-500/5" : "border-zinc-800 bg-black/40 opacity-90"}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="font-mono text-[11px] text-zinc-500">@{user}</div>
        {won && <span className="text-[10px] font-mono text-yellow-400">🏆 WIN</span>}
      </div>
      <div className="text-sm text-zinc-200 font-medium truncate">
        {coin?.tokenName || roast.tokenName || "Untitled"}
        {(coin?.ticker || roast.ticker) && (
          <span className="ml-1 text-[10px] font-mono text-zinc-500">${coin?.ticker || roast.ticker}</span>
        )}
      </div>
      <div className="text-[11px] text-zinc-400 italic mt-0.5 line-clamp-2">"{roast.tokenIdea}"</div>
      <div className="flex items-center gap-3 mt-2">
        <div className={`text-2xl font-black font-mono ${scoreColor(roast.score)}`}>
          {roast.score}<span className="text-[10px] text-zinc-600">/100</span>
        </div>
        <div className={`px-2 py-0.5 rounded text-[10px] font-mono ${verdictColor(roast.verdict)}`}>{roast.verdict}</div>
        <div className="text-[10px] font-mono text-red-400 ml-auto">☠ {roast.rugProbability}%</div>
      </div>
      <div className="mt-2 text-[11px] text-zinc-400 italic line-clamp-2">"{roast.summary}"</div>
    </div>
  );
}
