import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { API } from "../lib/api";
import { useUser } from "../context/UserContext";

type Friend = { userName: string; since: string | null; online: boolean };
type Req = { userName: string; sentAt: string };

function timeAgo(d: string | null) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function Friends() {
  const { userName } = useUser();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"friends" | "requests" | "find">("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<Req[]>([]);
  const [outgoing, setOutgoing] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);

  // search
  const [q, setQ] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [busyName, setBusyName] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});

  async function load() {
    if (!userName) return;
    const [a, b] = await Promise.all([
      fetch(`${API}/friends/list/${encodeURIComponent(userName)}`).then((r) => r.json()),
      fetch(`${API}/friends/requests/${encodeURIComponent(userName)}`).then((r) => r.json()),
    ]);
    setFriends(a.friends || []);
    setIncoming(b.incoming || []);
    setOutgoing(b.outgoing || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName]);

  useEffect(() => {
    if (!q.trim() || !userName) { setResults([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`${API}/friends/search?q=${encodeURIComponent(q)}&exclude=${encodeURIComponent(userName)}`).then((x) => x.json());
      setResults(r.users || []);
      // fetch each status
      const map: Record<string, string> = {};
      await Promise.all(
        (r.users || []).map(async (n: string) => {
          const s = await fetch(`${API}/friends/status?userName=${encodeURIComponent(userName)}&otherUser=${encodeURIComponent(n)}`).then((x) => x.json());
          map[n] = s.status;
        }),
      );
      setStatusMap(map);
    }, 300);
    return () => clearTimeout(t);
  }, [q, userName]);

  async function sendReq(other: string) {
    if (!userName) return;
    setBusyName(other);
    await fetch(`${API}/friends/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUser: userName, toUser: other }),
    }).catch(() => {});
    setStatusMap((m) => ({ ...m, [other]: "outgoing" }));
    setBusyName(null);
    load();
  }

  async function accept(other: string) {
    if (!userName) return;
    setBusyName(other);
    await fetch(`${API}/friends/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, otherUser: other }),
    }).catch(() => {});
    setBusyName(null);
    load();
  }
  async function decline(other: string) {
    if (!userName) return;
    setBusyName(other);
    await fetch(`${API}/friends/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, otherUser: other }),
    }).catch(() => {});
    setBusyName(null);
    load();
  }
  async function remove(other: string) {
    if (!userName) return;
    if (!confirm(`Remove @${other} from your friends?`)) return;
    setBusyName(other);
    await fetch(`${API}/friends/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, otherUser: other }),
    }).catch(() => {});
    setBusyName(null);
    load();
  }

  if (!userName) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-400 font-mono">Set your handle to use Friends.</p>
      </main>
    );
  }

  const tabBtn = (id: typeof tab, label: string, badge?: number) => (
    <button
      onClick={() => setTab(id)}
      className={`relative px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider border transition-colors ${
        tab === id
          ? "bg-pink-500/20 border-pink-500/50 text-pink-200"
          : "border-zinc-800 text-zinc-500 hover:text-zinc-200 hover:border-zinc-700"
      }`}
    >
      {label}
      {badge ? (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
          {badge}
        </span>
      ) : null}
    </button>
  );

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-purple-500/5 p-5 mb-5">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">
          <span className="text-pink-400">👯</span>{" "}
          <span className="text-zinc-100">Friends</span>
        </h1>
        <p className="text-zinc-500 text-xs font-mono mt-1">
          Add the legends. Battle them. Talk smack in DMs.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {tabBtn("friends", `Friends (${friends.length})`)}
        {tabBtn("requests", "Requests", incoming.length || undefined)}
        {tabBtn("find", "🔎 Find")}
      </div>

      {loading && <div className="text-zinc-500 font-mono text-xs text-center py-8">Loading...</div>}

      {!loading && tab === "friends" && (
        <div className="space-y-2">
          {friends.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-10 text-center">
              <div className="text-5xl mb-3">🫂</div>
              <p className="text-zinc-400 font-mono text-sm">No friends yet — go find some!</p>
              <button
                onClick={() => setTab("find")}
                className="mt-4 px-4 py-2 rounded-lg bg-pink-500/20 border border-pink-500/50 text-pink-200 font-mono text-xs hover:bg-pink-500/30"
              >
                🔎 Find people
              </button>
            </div>
          ) : (
            friends.map((f) => (
              <div
                key={f.userName}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex items-center gap-3 hover:border-zinc-700 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/30 border border-pink-500/40 flex items-center justify-center font-bold text-pink-200 text-lg">
                  {f.userName.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/u/${f.userName}`} className="font-mono text-sm text-zinc-100 font-bold hover:text-pink-300">
                    @{f.userName}
                  </Link>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                    <span className={`w-1.5 h-1.5 rounded-full ${f.online ? "bg-green-400 animate-pulse" : "bg-zinc-700"}`} />
                    {f.online ? "online" : "offline"}
                    {f.since && <span className="text-zinc-700">· friends for {timeAgo(f.since)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/u/${f.userName}?dm=1`}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/40 text-blue-300 text-[11px] font-mono hover:bg-blue-500/25"
                  >
                    💬
                  </Link>
                  <button
                    onClick={() => navigate(`/u/${f.userName}`)}
                    className="px-2.5 py-1.5 rounded-lg bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 text-[11px] font-mono hover:bg-yellow-500/25"
                  >
                    ⚔️
                  </button>
                  <button
                    onClick={() => remove(f.userName)}
                    disabled={busyName === f.userName}
                    title="Unfriend"
                    className="px-2 py-1.5 rounded-lg border border-zinc-800 text-zinc-600 text-[11px] hover:text-red-400 hover:border-red-500/40"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!loading && tab === "requests" && (
        <div className="space-y-5">
          <section>
            <h2 className="text-[11px] font-mono uppercase text-zinc-500 mb-2">📥 Incoming ({incoming.length})</h2>
            {incoming.length === 0 ? (
              <p className="text-zinc-600 text-xs font-mono">No incoming requests.</p>
            ) : (
              <div className="space-y-2">
                {incoming.map((r) => (
                  <div key={r.userName} className="rounded-xl border border-pink-500/30 bg-pink-500/5 p-3 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-pink-500/20 border border-pink-500/40 flex items-center justify-center font-bold text-pink-200 text-sm">
                      {r.userName.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Link href={`/u/${r.userName}`} className="font-mono text-sm text-zinc-100 hover:text-pink-300">@{r.userName}</Link>
                      <div className="text-[10px] font-mono text-zinc-500">wants to be friends · {timeAgo(r.sentAt)}</div>
                    </div>
                    <button
                      onClick={() => accept(r.userName)}
                      disabled={busyName === r.userName}
                      className="px-3 py-1.5 rounded-lg bg-green-500 text-black font-mono text-xs font-bold hover:bg-green-400 disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => decline(r.userName)}
                      disabled={busyName === r.userName}
                      className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 font-mono text-xs hover:text-red-400 hover:border-red-500/50 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section>
            <h2 className="text-[11px] font-mono uppercase text-zinc-500 mb-2">📤 Outgoing ({outgoing.length})</h2>
            {outgoing.length === 0 ? (
              <p className="text-zinc-600 text-xs font-mono">No outgoing requests.</p>
            ) : (
              <div className="space-y-1">
                {outgoing.map((r) => (
                  <div key={r.userName} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-300 text-sm">
                      {r.userName.slice(0, 1).toUpperCase()}
                    </span>
                    <Link href={`/u/${r.userName}`} className="font-mono text-sm text-zinc-300 flex-1 hover:text-pink-300">@{r.userName}</Link>
                    <span className="text-[10px] font-mono text-zinc-500">waiting · {timeAgo(r.sentAt)}</span>
                    <button
                      onClick={() => decline(r.userName)}
                      className="px-2 py-1 rounded text-[10px] text-zinc-600 hover:text-red-400 font-mono"
                    >
                      cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {!loading && tab === "find" && (
        <div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search users by handle..."
            className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:border-pink-500"
            autoFocus
          />
          <div className="mt-3 space-y-2">
            {q.trim() && results.length === 0 && (
              <p className="text-zinc-600 text-xs font-mono text-center py-6">No users matching "{q}"</p>
            )}
            {results.map((u) => {
              const status = statusMap[u] || "none";
              return (
                <div key={u} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-200 text-sm">
                    {u.slice(0, 1).toUpperCase()}
                  </span>
                  <Link href={`/u/${u}`} className="font-mono text-sm text-zinc-100 flex-1 hover:text-pink-300">@{u}</Link>
                  {status === "friends" && (
                    <span className="text-[11px] font-mono text-green-400">✓ friends</span>
                  )}
                  {status === "outgoing" && (
                    <span className="text-[11px] font-mono text-zinc-500">request sent</span>
                  )}
                  {status === "incoming" && (
                    <button
                      onClick={() => accept(u)}
                      disabled={busyName === u}
                      className="px-3 py-1.5 rounded-lg bg-green-500 text-black font-mono text-xs font-bold hover:bg-green-400"
                    >
                      Accept
                    </button>
                  )}
                  {status === "none" && (
                    <button
                      onClick={() => sendReq(u)}
                      disabled={busyName === u}
                      className="px-3 py-1.5 rounded-lg bg-pink-500/20 border border-pink-500/50 text-pink-200 font-mono text-xs hover:bg-pink-500/30 disabled:opacity-50"
                    >
                      + Add Friend
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
