import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { API, scoreColor, verdictColor } from "../lib/api";
import { useUser } from "../context/UserContext";

type Stats = { total: number; avgScore: number; roastCount: number; battleCount: number; totalVotesReceived: number };
type ActivityItem = { id: number; userName: string; type: string; coinName: string; score: number | null; verdict: string | null; createdAt: string };
type BattleRequest = { id: number; fromUser: string; toUser: string; status: string; fromCoin: any; toCoin: any; result: any; createdAt: string };

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function UserProfile() {
  const [, params] = useRoute("/u/:name");
  const [, navigate] = useLocation();
  const name = params?.name || "";
  const { userName } = useUser();
  const isOwn = userName === name;

  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [topCoin, setTopCoin] = useState<ActivityItem | null>(null);
  const [loading, setLoading] = useState(true);

  const [battleRequests, setBattleRequests] = useState<BattleRequest[]>([]);
  const [requestOpen, setRequestOpen] = useState(false);
  const [battleCoin, setBattleCoin] = useState({ tokenIdea: "", tokenName: "", ticker: "" });
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [respondCoin, setRespondCoin] = useState({ tokenIdea: "", tokenName: "", ticker: "" });
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    if (!name) return;
    Promise.all([
      fetch(`${API}/community/user/${encodeURIComponent(name)}`).then((r) => r.json()),
      isOwn && userName ? fetch(`${API}/battle-requests?userName=${encodeURIComponent(userName)}`).then((r) => r.json()) : Promise.resolve({ requests: [] }),
    ]).then(([profileData, battleData]) => {
      setStats(profileData.stats);
      setActivity(profileData.activity || []);
      setTopCoin(profileData.topCoin ?? null);
      setBattleRequests(battleData.requests || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [name, userName, isOwn]);

  async function sendBattleRequest() {
    if (!battleCoin.tokenIdea.trim() || !userName || sendingRequest) return;
    setSendingRequest(true);
    await fetch(`${API}/battle-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUser: userName, toUser: name, fromCoin: battleCoin }),
    }).catch(() => {});
    setSendingRequest(false);
    setRequestSent(true);
    setTimeout(() => { setRequestOpen(false); setRequestSent(false); setBattleCoin({ tokenIdea: "", tokenName: "", ticker: "" }); }, 2500);
  }

  async function acceptBattle(req: BattleRequest) {
    if (!respondCoin.tokenIdea.trim() || !userName || responding) return;
    setResponding(true);
    try {
      const r = await fetch(`${API}/battle-requests/${req.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toCoin: respondCoin, userName }),
      });
      const data = await r.json();
      setBattleRequests((prev) => prev.map((b) => b.id === req.id ? { ...b, status: "accepted", result: data.result } : b));
      setRespondingId(null);
      setRespondCoin({ tokenIdea: "", tokenName: "", ticker: "" });
    } catch {} finally { setResponding(false); }
  }

  async function declineBattle(id: number) {
    await fetch(`${API}/battle-requests/${id}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName }),
    }).catch(() => {});
    setBattleRequests((prev) => prev.map((b) => b.id === id ? { ...b, status: "declined" } : b));
  }

  const pendingIncoming = battleRequests.filter((r) => r.toUser === userName && r.status === "pending");
  const pendingOutgoing = battleRequests.filter((r) => r.fromUser === userName && r.status === "pending");

  if (loading) return <main className="max-w-2xl mx-auto px-4 py-16 text-center text-zinc-500 font-mono">Loading...</main>;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* Profile header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-3xl font-black">
              <span className="text-orange-400">@</span>
              <span className="text-zinc-100">{name}</span>
              {isOwn && <span className="text-green-400 text-sm font-mono ml-2">(you)</span>}
            </div>
            {stats && (
              <div className="text-zinc-500 text-xs font-mono mt-1">
                {stats.roastCount} roasts · {stats.battleCount} battles · avg {stats.avgScore ?? "—"}/100 · {stats.totalVotesReceived ?? 0} community votes
              </div>
            )}
          </div>

          {!isOwn && userName && (
            <button
              onClick={() => setRequestOpen((p) => !p)}
              className="px-4 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 font-mono text-sm hover:bg-yellow-500/30 transition-colors"
            >
              ⚔️ Request Battle
            </button>
          )}
        </div>

        {/* Battle request form */}
        {requestOpen && !isOwn && (
          <div className="mt-4 border-t border-zinc-800 pt-4 space-y-2">
            {requestSent ? (
              <p className="text-green-400 font-mono text-sm">Challenge sent! 🎯 Check the Shoutbox.</p>
            ) : (
              <>
                <p className="text-zinc-400 text-xs font-mono mb-2">Enter your coin to battle with:</p>
                <input value={battleCoin.tokenIdea} onChange={(e) => setBattleCoin((p) => ({ ...p, tokenIdea: e.target.value }))} placeholder="Your coin idea *" className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={battleCoin.tokenName} onChange={(e) => setBattleCoin((p) => ({ ...p, tokenName: e.target.value }))} placeholder="Name (optional)" className="bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-yellow-500" />
                  <input value={battleCoin.ticker} onChange={(e) => setBattleCoin((p) => ({ ...p, ticker: e.target.value.toUpperCase() }))} placeholder="TICKER" className="bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-yellow-500" />
                </div>
                <button onClick={sendBattleRequest} disabled={!battleCoin.tokenIdea.trim() || sendingRequest} className="w-full py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-bold text-sm">
                  {sendingRequest ? "Sending..." : "⚔️ Send Battle Request"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Top coin */}
      {topCoin && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 mb-6">
          <div className="text-xs font-mono text-zinc-500 uppercase mb-2">🏅 Best Coin</div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-200 text-sm font-medium">{topCoin.coinName}</span>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-black ${scoreColor(topCoin.score!)}`}>{topCoin.score}</span>
              {topCoin.verdict && <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${verdictColor(topCoin.verdict)}`}>{topCoin.verdict}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Incoming battle requests (own profile only) */}
      {isOwn && pendingIncoming.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-mono uppercase text-yellow-400 mb-3">⚔️ Incoming Battle Requests</h2>
          <div className="space-y-3">
            {pendingIncoming.map((req) => {
              const fc = req.fromCoin as any;
              return (
                <div key={req.id} className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-orange-400 font-mono font-bold text-sm">{req.fromUser}</span>
                      <span className="text-zinc-400 text-xs ml-2">challenges you with "{fc?.tokenName || fc?.tokenIdea}"</span>
                    </div>
                    <span className="text-zinc-600 text-xs">{timeAgo(req.createdAt)}</span>
                  </div>
                  {respondingId === req.id ? (
                    <div className="space-y-2">
                      <input value={respondCoin.tokenIdea} onChange={(e) => setRespondCoin((p) => ({ ...p, tokenIdea: e.target.value }))} placeholder="Your coin idea *" className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                      <div className="grid grid-cols-2 gap-2">
                        <input value={respondCoin.tokenName} onChange={(e) => setRespondCoin((p) => ({ ...p, tokenName: e.target.value }))} placeholder="Name" className="bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs focus:outline-none" />
                        <input value={respondCoin.ticker} onChange={(e) => setRespondCoin((p) => ({ ...p, ticker: e.target.value.toUpperCase() }))} placeholder="TICKER" className="bg-black border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => acceptBattle(req)} disabled={!respondCoin.tokenIdea.trim() || responding} className="flex-1 py-2 rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold text-sm">
                          {responding ? "Running battle..." : "⚔️ Accept & Battle"}
                        </button>
                        <button onClick={() => setRespondingId(null)} className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setRespondingId(req.id)} className="flex-1 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 text-sm font-mono hover:bg-yellow-500/30">Accept ⚔️</button>
                      <button onClick={() => declineBattle(req.id)} className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-500 text-sm hover:text-red-400">Decline</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Outgoing pending */}
      {isOwn && pendingOutgoing.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-mono uppercase text-zinc-500 mb-3">📤 Sent Requests</h2>
          {pendingOutgoing.map((req) => (
            <div key={req.id} className="text-xs font-mono text-zinc-500 py-1">
              Waiting on <span className="text-orange-400">{req.toUser}</span> — {timeAgo(req.createdAt)}
            </div>
          ))}
        </div>
      )}

      {/* Activity feed */}
      <div>
        <h2 className="text-sm font-mono uppercase text-zinc-500 mb-3">Activity</h2>
        {activity.length === 0 && <p className="text-zinc-600 text-sm font-mono">No activity yet.</p>}
        <div className="space-y-2">
          {activity.map((item) => (
            <div key={item.id} className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3">
              <span>{item.type === "battle" ? "⚔️" : "🔥"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-zinc-200 text-sm truncate">{item.coinName}</div>
                <div className="text-zinc-600 text-xs">{timeAgo(item.createdAt)}</div>
              </div>
              {item.score !== null && (
                <div className="text-right shrink-0">
                  <div className={`text-xl font-black ${scoreColor(item.score!)}`}>{item.score}</div>
                  {item.verdict && <div className={`text-[10px] font-mono px-1 rounded border ${verdictColor(item.verdict)}`}>{item.verdict}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
