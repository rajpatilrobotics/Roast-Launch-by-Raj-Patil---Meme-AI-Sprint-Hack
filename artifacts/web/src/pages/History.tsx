import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { API, scoreColor } from "../lib/api";
import { useUser } from "../context/UserContext";
import ActivityCard from "../components/community/ActivityCard";
import ChatPanel from "../components/community/ChatPanel";

type DailyChallenge = { date: string; narrative: string; prompt: string; emoji: string; reward: string; completed: boolean; participants: number };
type RoastOfWeek = { id: number; userName: string; coinName: string; score: number | null; verdict: string | null; votes: number };
type DailyBattle = {
  id: number;
  coinA: { id: number; userName: string; coinName: string; score: number | null; verdict: string | null } | null;
  coinB: { id: number; userName: string; coinName: string; score: number | null; verdict: string | null } | null;
  votesA: number;
  votesB: number;
  myVote: "A" | "B" | null;
};

type ActivityItem = { id: number; userName: string; type: string; coinName: string; score: number | null; verdict: string | null; createdAt: string; remixOfId?: number | null; remixOfUser?: string | null };
type Summary = { reactions: Record<string, number>; myReactions: string[]; voteTotal: number; myVote: number; commentCount: number };
type LeaderboardUser = { userName: string; total: number; avgScore: number; roastCount: number; battleCount: number };
type LaunchLeader = { userName: string; launchCount: number; avgScore: number | null; lastLaunchAt: string };
type RecentLaunch = { id: number; userName: string; coinName: string; score: number | null; verdict: string | null; result: any; createdAt: string };
type Recap = { empty: boolean; totalActivity: number; topUser: { userName: string; count: number } | null; bestCoin: { userName: string; coinName: string; score: number; verdict: string } | null; mostLoved: any | null };

const MEDALS = ["🥇", "🥈", "🥉"];
type SortMode = "newest" | "top" | "discussed";

export default function History() {
  const { userName } = useUser();
  const [, navigate] = useLocation();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [summary, setSummary] = useState<Record<number, Summary>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [launchTab, setLaunchTab] = useState<"roasters" | "launches">("roasters");
  const [launchLeaders, setLaunchLeaders] = useState<LaunchLeader[]>([]);
  const [recentLaunches, setRecentLaunches] = useState<RecentLaunch[]>([]);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [chatOpen, setChatOpen] = useState(false);

  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [rotw, setRotw] = useState<RoastOfWeek | null>(null);
  const [battle, setBattle] = useState<DailyBattle | null>(null);
  const [battleVoting, setBattleVoting] = useState(false);

  useEffect(() => {
    fetch(`${API}/community/daily-challenge?userName=${encodeURIComponent(userName || "")}`)
      .then((r) => r.json()).then(setChallenge).catch(() => {});
    fetch(`${API}/community/roast-of-the-week`).then((r) => r.json())
      .then((d) => setRotw(d.winner || null)).catch(() => {});
    fetch(`${API}/community/daily-battle?userName=${encodeURIComponent(userName || "")}`)
      .then((r) => r.json()).then((d) => setBattle(d.battle || null)).catch(() => {});
  }, [userName]);

  function takeChallenge() {
    if (!challenge) return;
    sessionStorage.setItem("roastlaunch:prefill", JSON.stringify({
      idea: `A meme coin in the ${challenge.narrative} narrative`,
      name: "",
      ticker: "",
    }));
    navigate("/");
  }

  async function voteBattle(side: "A" | "B") {
    if (!battle || !userName || battleVoting) return;
    setBattleVoting(true);
    const prevSide = battle.myVote;
    const newBattle = { ...battle, myVote: side } as DailyBattle;
    if (prevSide !== side) {
      if (side === "A") {
        newBattle.votesA += 1;
        if (prevSide === "B") newBattle.votesB = Math.max(0, newBattle.votesB - 1);
      } else {
        newBattle.votesB += 1;
        if (prevSide === "A") newBattle.votesA = Math.max(0, newBattle.votesA - 1);
      }
    }
    setBattle(newBattle);
    await fetch(`${API}/community/daily-battle/vote`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ battleId: battle.id, userName, side }),
    }).catch(() => {});
    setBattleVoting(false);
  }

  useEffect(() => {
    fetch(`${API}/community/launches`).then((r) => r.json())
      .then((d) => {
        setLaunchLeaders(d.leaderboard || []);
        setRecentLaunches(d.recent || []);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/activity`).then((r) => r.json()),
      fetch(`${API}/community/leaderboard`).then((r) => r.json()),
      fetch(`${API}/community/recap`).then((r) => r.json()),
    ]).then(([actData, lbData, recapData]) => {
      const items: ActivityItem[] = actData.activity || [];
      setActivity(items);
      setLeaderboard(lbData.leaderboard || []);
      setRecap(recapData.empty ? null : recapData);
      setLoading(false);

      if (items.length > 0) {
        const ids = items.map((i) => i.id).join(",");
        fetch(`${API}/community/summary?ids=${ids}&userName=${encodeURIComponent(userName || "")}`)
          .then((r) => r.json())
          .then((d) => {
            const s: Record<number, Summary> = {};
            for (const item of items) {
              s[item.id] = d.summary[item.id] || { reactions: {}, myReactions: [], voteTotal: 0, myVote: 0, commentCount: 0 };
            }
            setSummary(s);
          }).catch(() => {});
      }
    }).catch(() => setLoading(false));
  }, [userName]);

  function patchSummary(id: number, patch: Partial<Summary>) {
    setSummary((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { reactions: {}, myReactions: [], voteTotal: 0, myVote: 0, commentCount: 0 }), ...patch },
    }));
  }

  let displayed = filter === "mine" ? activity.filter((a) => a.userName === userName) : [...activity];

  if (sort === "top") {
    displayed = [...displayed].sort((a, b) => (summary[b.id]?.voteTotal ?? 0) - (summary[a.id]?.voteTotal ?? 0));
  } else if (sort === "discussed") {
    displayed = [...displayed].sort((a, b) => (summary[b.id]?.commentCount ?? 0) - (summary[a.id]?.commentCount ?? 0));
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">

      {/* Daily Challenge */}
      {challenge && (
        <div className="mb-6 rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-500/10 to-pink-500/5 p-4 sm:p-5 flex items-center gap-4 flex-wrap">
          <div className="text-4xl shrink-0">{challenge.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase text-purple-300 bg-purple-500/15 border border-purple-500/40 rounded-full px-2 py-0.5">Daily Challenge</span>
              <span className="text-[10px] font-mono text-zinc-500">{challenge.participants} {challenge.participants === 1 ? "player" : "players"} today</span>
              {challenge.completed && <span className="text-[10px] font-mono text-green-400">✓ Completed</span>}
            </div>
            <p className="text-zinc-100 text-sm font-bold">{challenge.prompt}</p>
            <p className="text-purple-300/70 text-[11px] font-mono mt-0.5">Reward: {challenge.reward}</p>
          </div>
          <button onClick={takeChallenge}
            className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/50 text-purple-200 text-xs font-mono uppercase tracking-wider hover:bg-purple-500/30 shrink-0">
            {challenge.completed ? "Try Again" : "Accept ▸"}
          </button>
        </div>
      )}

      {/* Daily Battle */}
      {battle && battle.coinA && battle.coinB && (
        <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 via-orange-500/5 to-red-500/5 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono uppercase text-yellow-300 bg-yellow-500/15 border border-yellow-500/40 rounded-full px-2 py-0.5">⚔️ Daily Battle</span>
            <span className="text-[10px] font-mono text-zinc-500">Today's top 2 — vote your champion</span>
          </div>
          {(() => {
            const total = battle.votesA + battle.votesB;
            const pctA = total > 0 ? Math.round((battle.votesA / total) * 100) : 50;
            const pctB = 100 - pctA;
            return (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { side: "A" as const, coin: battle.coinA, votes: battle.votesA, pct: pctA, color: "orange" },
                    { side: "B" as const, coin: battle.coinB, votes: battle.votesB, pct: pctB, color: "purple" },
                  ]).map(({ side, coin, votes, pct, color }) => {
                    const mine = battle.myVote === side;
                    const colorClasses = color === "orange"
                      ? (mine ? "border-orange-500/70 bg-orange-500/15 hover:border-orange-500/80" : "border-orange-500/30 bg-orange-500/5 hover:border-orange-500/50")
                      : (mine ? "border-purple-500/70 bg-purple-500/15 hover:border-purple-500/80" : "border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50");
                    return (
                      <button key={side} onClick={() => voteBattle(side)} disabled={!userName || battleVoting}
                        className={`text-left rounded-xl border p-3 transition-colors ${colorClasses} disabled:opacity-60`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-mono text-[10px] text-zinc-500 truncate">@{coin!.userName}</div>
                          {coin!.score !== null && <div className={`text-xs font-black ${scoreColor(coin!.score!)}`}>{coin!.score}</div>}
                        </div>
                        <div className="text-zinc-100 text-sm font-bold truncate mt-0.5">{coin!.coinName}</div>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-[10px] font-mono ${color === "orange" ? "text-orange-300" : "text-purple-300"}`}>
                            {votes} {votes === 1 ? "vote" : "votes"} · {pct}%
                          </span>
                          {mine && <span className="text-[10px] font-mono text-green-400">✓ Your pick</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 h-1.5 rounded-full overflow-hidden flex bg-zinc-900">
                  <div className="bg-orange-500/60 transition-all" style={{ width: `${pctA}%` }} />
                  <div className="bg-purple-500/60 transition-all" style={{ width: `${pctB}%` }} />
                </div>
              </>
            );
          })()}
          {!userName && <p className="text-zinc-600 text-[10px] font-mono mt-2">Set your handle to vote.</p>}
        </div>
      )}

      {/* Roast of the Week */}
      {rotw && (
        <div className="mb-6 rounded-2xl border border-yellow-400/40 bg-gradient-to-r from-yellow-500/10 to-amber-500/5 p-4 sm:p-5 flex items-center gap-4">
          <div className="text-4xl shrink-0">🏆</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono uppercase text-yellow-300 mb-1">Roast of the Week</div>
            <div className="text-zinc-100 text-sm font-bold truncate">"{rotw.coinName}"</div>
            <div className="text-zinc-500 text-[11px] font-mono mt-0.5">
              by <a href={`/u/${rotw.userName}`} className="text-orange-400 hover:underline">@{rotw.userName}</a>
              {rotw.votes > 0 && <> · ▲ {rotw.votes} community votes</>}
              {rotw.verdict && <> · {rotw.verdict}</>}
            </div>
          </div>
          {rotw.score !== null && (
            <div className={`text-3xl font-black shrink-0 ${scoreColor(rotw.score!)}`}>{rotw.score}</div>
          )}
        </div>
      )}

      {/* Weekly recap */}
      {recap && !recap.empty && (
        <div className="mb-8 rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5">
          <div className="text-xs font-mono uppercase text-orange-400 mb-3">📅 This Week's Recap</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-zinc-500 text-[11px] font-mono">Total Activity</div>
              <div className="text-2xl font-black text-orange-400">{recap.totalActivity}</div>
            </div>
            {recap.topUser && (
              <div>
                <div className="text-zinc-500 text-[11px] font-mono">Most Active</div>
                <div className="text-lg font-black text-zinc-200 truncate">@{recap.topUser.userName}</div>
                <div className="text-zinc-600 text-[10px] font-mono">{recap.topUser.count} ops</div>
              </div>
            )}
            {recap.bestCoin && (
              <div>
                <div className="text-zinc-500 text-[11px] font-mono">Highest Score</div>
                <div className="text-zinc-200 text-sm font-medium truncate">{recap.bestCoin.coinName}</div>
                <div className="text-green-400 font-black text-lg">{recap.bestCoin.score}/100</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard with tabs */}
      {(leaderboard.length > 0 || launchLeaders.length > 0) && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">
              {launchTab === "roasters" ? "🏆 Top Roasters" : "🚀 Top Launchers"}
            </h2>
            <div className="flex gap-1" data-testid="leaderboard-tabs">
              {([
                ["roasters", "Roasters"],
                ["launches", "Launches"],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setLaunchTab(k)}
                  className={`px-3 py-1 rounded-lg font-mono text-[10px] uppercase tracking-wider border transition-colors ${
                    launchTab === k
                      ? k === "roasters"
                        ? "bg-orange-500/20 border-orange-500/50 text-orange-400"
                        : "bg-green-500/20 border-green-500/50 text-green-400"
                      : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
                  }`}
                  data-testid={`leaderboard-tab-${k}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {launchTab === "roasters" ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {leaderboard.slice(0, 3).map((u, i) => (
                <div key={u.userName} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${i === 0 ? "border-yellow-500/50 bg-yellow-500/5" : i === 1 ? "border-zinc-400/40 bg-zinc-400/5" : "border-orange-700/40 bg-orange-900/5"}`}>
                  <span className="text-2xl">{MEDALS[i]}</span>
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-bold text-zinc-100 truncate">{u.userName}</div>
                    <div className="text-[11px] text-zinc-500 font-mono">{u.total} ops · avg {u.avgScore ?? "—"}/100</div>
                  </div>
                </div>
              ))}
            </div>
          ) : launchLeaders.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-5 text-center">
              <div className="text-3xl mb-1">🚀</div>
              <div className="text-zinc-400 text-sm font-mono">No launches yet — be the first to ship on Four.meme.</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {launchLeaders.slice(0, 3).map((u, i) => (
                  <div key={u.userName} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${i === 0 ? "border-green-500/50 bg-green-500/5" : i === 1 ? "border-zinc-400/40 bg-zinc-400/5" : "border-orange-700/40 bg-orange-900/5"}`}>
                    <span className="text-2xl">{MEDALS[i]}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-sm font-bold text-zinc-100 truncate">{u.userName}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        {u.launchCount} {u.launchCount === 1 ? "launch" : "launches"} · avg {u.avgScore ?? "—"}/100
                      </div>
                    </div>
                    <div className="text-2xl">🚀</div>
                  </div>
                ))}
              </div>

              {recentLaunches.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider mb-2">Recent launches</div>
                  <div className="space-y-2">
                    {recentLaunches.map((l) => {
                      const ticker = l.result?.ticker || "";
                      return (
                        <div key={l.id} className="rounded-lg border border-zinc-800 bg-black/40 p-3 flex items-center gap-3">
                          <span className="text-lg shrink-0">🚀</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-zinc-200 truncate">
                              <span className="text-green-400 font-mono">@{l.userName}</span>
                              <span className="text-zinc-500"> launched </span>
                              <span className="font-bold">{l.coinName}</span>
                              {ticker && <span className="text-orange-400 font-mono"> ${ticker}</span>}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500">
                              on Four.meme · {new Date(l.createdAt).toLocaleString()}
                            </div>
                          </div>
                          {typeof l.score === "number" && (
                            <div className={`text-lg font-black font-mono ${scoreColor(l.score)}`}>{l.score}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Title + filter + sort */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black">
            <span className="text-orange-400">Community</span>{" "}
            <span className="text-zinc-300">History</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-0.5">Every roast and battle from all users, live.</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="flex gap-1">
            {(["all", "mine"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg font-mono text-xs uppercase tracking-wider border transition-colors ${filter === f ? (f === "all" ? "bg-orange-500/20 border-orange-500/50 text-orange-400" : "bg-green-500/20 border-green-500/50 text-green-400") : "border-zinc-700 text-zinc-400 hover:text-zinc-200"}`}>
                {f === "all" ? "Everyone" : "Mine"}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {([["newest", "New"], ["top", "Top"], ["discussed", "Hot"]] as [SortMode, string][]).map(([s, label]) => (
              <button key={s} onClick={() => setSort(s)}
                className={`px-2 py-0.5 rounded font-mono text-[10px] uppercase border transition-colors ${sort === s ? "border-zinc-500 text-zinc-200 bg-zinc-800" : "border-zinc-800 text-zinc-600 hover:text-zinc-400"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <div className="text-zinc-500 text-sm text-center py-20 font-mono">Loading...</div>}

      {!loading && displayed.length === 0 && (
        <div className="text-zinc-600 text-sm text-center py-20 font-mono">
          {filter === "mine" ? "You haven't done anything yet — go roast something!" : "No activity yet."}
        </div>
      )}

      <div className="space-y-3">
        {displayed.map((item) => (
          <ActivityCard key={item.id} item={item}
            summary={summary[item.id] || { reactions: {}, myReactions: [], voteTotal: 0, myVote: 0, commentCount: 0 }}
            userName={userName || ""} onSummaryChange={patchSummary} />
        ))}
      </div>

      <button onClick={() => setChatOpen((p) => !p)}
        className="fixed bottom-5 right-4 z-40 w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-400 text-black text-xl shadow-lg shadow-orange-500/30 flex items-center justify-center transition-transform hover:scale-110"
        title="Open shoutbox">
        💬
      </button>

      <ChatPanel userName={userName || ""} open={chatOpen} onClose={() => setChatOpen(false)} />
    </main>
  );
}
