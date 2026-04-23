import { useEffect, useState } from "react";
import { API } from "../lib/api";
import { useUser } from "../context/UserContext";
import ActivityCard from "../components/community/ActivityCard";
import ChatPanel from "../components/community/ChatPanel";

type ActivityItem = { id: number; userName: string; type: string; coinName: string; score: number | null; verdict: string | null; createdAt: string };
type Summary = { reactions: Record<string, number>; myReactions: string[]; voteTotal: number; myVote: number; commentCount: number };
type LeaderboardUser = { userName: string; total: number; avgScore: number; roastCount: number; battleCount: number };
type Recap = { empty: boolean; totalActivity: number; topUser: { userName: string; count: number } | null; bestCoin: { userName: string; coinName: string; score: number; verdict: string } | null; mostLoved: any | null };

const MEDALS = ["🥇", "🥈", "🥉"];
type SortMode = "newest" | "top" | "discussed";

export default function History() {
  const { userName } = useUser();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [summary, setSummary] = useState<Record<number, Summary>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [sort, setSort] = useState<SortMode>("newest");
  const [chatOpen, setChatOpen] = useState(false);

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

      {/* Leaderboard strip */}
      {leaderboard.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-mono uppercase text-zinc-500 mb-3 tracking-wider">🏆 Top Roasters</h2>
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
