import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { API, type Roast, scoreColor, verdictColor } from "../lib/api";
import { useUser } from "../context/UserContext";
import LiveBattleHistory from "../components/LiveBattleHistory";

type OnlineUser = { userName: string; lastSeen: string };

type BattleResult = { a: Roast; b: Roast; winner: "A" | "B"; reason: string };

type Coin = { idea: string; name: string; ticker: string };
type Matchup = { label: string; a: Coin; b: Coin };

const MATCHUPS: Matchup[] = [
  {
    label: "🐸 Pepe vs 🐕 Doge — classic beef",
    a: { idea: "Pepe the frog returns as a DeFi yield farmer", name: "Pepe Yield", ticker: "PYLD" },
    b: { idea: "Doge that pays his own crypto taxes on time", name: "Tax Doge", ticker: "TXDOG" },
  },
  {
    label: "🤖 AI Agent vs 🧠 Brainrot",
    a: { idea: "AI agent that rugs itself for science", name: "AutoRug", ticker: "ARUG" },
    b: { idea: "Italian brainrot meta token — Tralalero Tralala", name: "Brainrot", ticker: "BRRR" },
  },
  {
    label: "👟 Elon's shoe vs 💍 CZ's ring",
    a: { idea: "Elon's left shoe token, fully on-chain", name: "Elon Shoe", ticker: "SHOE" },
    b: { idea: "CZ's lost wedding ring, recovered on BNB Chain", name: "CZ Ring", ticker: "RING" },
  },
  {
    label: "🦍 Smart Ape vs 👴 Boomer",
    a: { idea: "Ape that does its own due diligence before aping", name: "DYOR Ape", ticker: "DAPE" },
    b: { idea: "Boomer who just discovered crypto in 2026", name: "Late Boomer", ticker: "BOOM" },
  },
  {
    label: "🛸 Alien Shorter vs 🧙 FUD Wizard",
    a: { idea: "Alien who came to Earth just to short Bitcoin", name: "Alien Short", ticker: "ALSHRT" },
    b: { idea: "Wizard that turns FUD into liquidity", name: "FUD Wizard", ticker: "FUDW" },
  },
  {
    label: "🪦 Auto-Rug vs 🥷 Honest Dev",
    a: { idea: "Token that auto-rugs at 100M market cap", name: "AutoExit", ticker: "EXIT" },
    b: { idea: "Anonymous dev who literally cannot rug (smart contract locked)", name: "NoRug", ticker: "SAFE" },
  },
];

function CoinPanel({ label, idea, setIdea, name, setName, ticker, setTicker, color }: any) {
  return (
    <div className={`rounded-2xl border-2 ${color} bg-black/60 p-5`}>
      <div className="font-mono uppercase text-xs mb-3">{label}</div>
      <textarea value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="describe your coin..." rows={3} className="w-full bg-black/60 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-orange-500 resize-none" />
      <div className="grid grid-cols-2 gap-2 mt-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="bg-black/60 border border-zinc-800 rounded-lg p-2 text-xs" />
        <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="TICKER" className="bg-black/60 border border-zinc-800 rounded-lg p-2 text-xs font-mono" />
      </div>
    </div>
  );
}

function ResultCard({ r, isWinner }: { r: Roast; isWinner: boolean }) {
  return (
    <div className={`rounded-2xl border-2 p-5 ${isWinner ? "border-yellow-500/80 glow-orange" : "border-zinc-800 opacity-80"}`}>
      {isWinner && <div className="text-center text-3xl mb-2">🏆 WINNER</div>}
      <div className="text-sm text-zinc-300 mb-2">"{r.tokenIdea}"</div>
      <div className={`text-5xl font-black font-mono text-center ${scoreColor(r.score)}`}>
        {r.score}<span className="text-xl text-zinc-600">/100</span>
      </div>
      <div className={`mt-2 text-center text-xs font-mono px-2 py-1 rounded inline-block w-full ${verdictColor(r.verdict)}`}>{r.verdict}</div>
      <div className="text-[11px] font-mono text-red-400 text-center mt-2">☠ Rug {r.rugProbability}%</div>
      <div className="mt-3 text-xs italic text-zinc-400">"{r.summary}"</div>
    </div>
  );
}

export default function Battle() {
  const [a, setA] = useState({ idea: "", name: "", ticker: "" });
  const [b, setB] = useState({ idea: "", name: "", ticker: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BattleResult | null>(null);
  const { userName } = useUser();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"solo" | "live">("solo");
  const [online, setOnline] = useState<OnlineUser[]>([]);
  const [inviting, setInviting] = useState<string | null>(null);
  const [waitingRoomId, setWaitingRoomId] = useState<number | null>(null);

  useEffect(() => {
    if (mode !== "live" || !userName) return;
    let alive = true;
    const fetchOnline = async () => {
      try {
        const r = await fetch(`${API}/presence/online?exclude=${encodeURIComponent(userName)}`);
        const d = await r.json();
        if (alive) setOnline(d.users || []);
      } catch {}
    };
    fetchOnline();
    const id = setInterval(fetchOnline, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [mode, userName]);

  // poll waiting room — when opponent accepts, jump in
  useEffect(() => {
    if (!waitingRoomId) return;
    let alive = true;
    const id = setInterval(async () => {
      try {
        const r = await fetch(`${API}/live-battle/room/${waitingRoomId}`);
        const d = await r.json();
        if (!alive) return;
        const status = d.room?.status;
        if (status === "active") {
          navigate(`/battle/live/${waitingRoomId}`);
          setWaitingRoomId(null);
        } else if (status === "declined" || status === "expired") {
          setInviting(null);
          setWaitingRoomId(null);
          alert(status === "declined" ? "They declined." : "Invite expired.");
        }
      } catch {}
    }, 1500);
    return () => { alive = false; clearInterval(id); };
  }, [waitingRoomId, navigate]);

  async function inviteUser(opponent: string) {
    if (!userName || inviting) return;
    setInviting(opponent);
    try {
      const r = await fetch(`${API}/live-battle/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostUser: userName, opponentUser: opponent }),
      });
      const d = await r.json();
      if (d.room?.id) setWaitingRoomId(d.room.id);
      else { setInviting(null); alert(d.error || "Invite failed"); }
    } catch (e: any) {
      setInviting(null);
      alert("Invite failed: " + (e?.message || e));
    }
  }

  async function battle() {
    if (!a.idea.trim() || !b.idea.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch(`${API}/battle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coinA: { tokenIdea: a.idea, tokenName: a.name, ticker: a.ticker },
          coinB: { tokenIdea: b.idea, tokenName: b.name, ticker: b.ticker },
          userName: userName || undefined,
        }),
      });
      setResult(await r.json());
    } catch (e: any) {
      alert("Battle failed: " + (e.message || e));
    } finally {
      setLoading(false);
    }
  }

  function shareWin() {
    if (!result) return;
    const winnerIdea = result.winner === "A" ? result.a.tokenIdea : result.b.tokenIdea;
    const loserIdea = result.winner === "A" ? result.b.tokenIdea : result.a.tokenIdea;
    const text = `My coin "${winnerIdea}" just DESTROYED "${loserIdea}" on RoastLaunch 🥊🔥 #RoastLaunch #FourMeme #BNBChain`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="min-h-screen scanline">
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">🥊 Roast Battle</h1>
          <p className="mt-2 text-zinc-400 font-mono text-sm">Two coins enter. One survives.</p>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          <button onClick={() => setMode("solo")}
            className={`px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider border transition-colors ${mode === "solo" ? "bg-orange-500/20 border-orange-500/50 text-orange-300" : "border-zinc-700 text-zinc-400 hover:text-zinc-200"}`}>
            🥊 Solo Battle
          </button>
          <button onClick={() => setMode("live")}
            className={`px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider border transition-colors flex items-center gap-2 ${mode === "live" ? "bg-red-500/20 border-red-500/50 text-red-300" : "border-zinc-700 text-zinc-400 hover:text-zinc-200"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${mode === "live" ? "bg-red-500 animate-pulse" : "bg-zinc-600"}`} />
            🔴 Live 1v1
          </button>
        </div>

        {mode === "live" && (
          <>
            <LivePanel
              userName={userName}
              online={online}
              inviting={inviting}
              waitingRoomId={waitingRoomId}
              onInvite={inviteUser}
              onCancelWait={() => { setInviting(null); setWaitingRoomId(null); }}
            />
            <LiveBattleHistory currentUser={userName} />
          </>
        )}

        {mode === "solo" && <>
        <div className="mb-5 rounded-xl border border-zinc-800 bg-black/40 p-4">
          <div className="font-mono uppercase text-xs text-orange-400 mb-2">
            🥊 Try a famous matchup
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const m = MATCHUPS[Math.floor(Math.random() * MATCHUPS.length)];
                setA(m.a);
                setB(m.b);
              }}
              className="px-3 py-1.5 rounded-full border border-orange-500/60 bg-orange-500/10 text-orange-300 text-xs font-mono hover-elevate"
            >
              🎲 Random matchup
            </button>
            {MATCHUPS.map((m) => (
              <button
                key={m.label}
                onClick={() => {
                  setA(m.a);
                  setB(m.b);
                }}
                className="px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-300 text-xs font-mono hover-elevate"
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <CoinPanel label="Coin A" {...{ idea: a.idea, setIdea: (v: string) => setA({ ...a, idea: v }), name: a.name, setName: (v: string) => setA({ ...a, name: v }), ticker: a.ticker, setTicker: (v: string) => setA({ ...a, ticker: v }), color: "border-green-500/60 glow-green" }} />
          <CoinPanel label="Coin B" {...{ idea: b.idea, setIdea: (v: string) => setB({ ...b, idea: v }), name: b.name, setName: (v: string) => setB({ ...b, name: v }), ticker: b.ticker, setTicker: (v: string) => setB({ ...b, ticker: v }), color: "border-red-500/60 glow-red" }} />
        </div>

        <button
          onClick={battle}
          disabled={loading || !a.idea.trim() || !b.idea.trim()}
          className="mt-5 w-full py-4 rounded-xl bg-gradient-to-r from-red-500 via-orange-500 to-green-500 text-black font-black text-lg uppercase tracking-wider disabled:opacity-50"
        >
          {loading ? "⚔️ BATTLING..." : "⚔️ START BATTLE"}
        </button>

        {result && (
          <>
            <div className="mt-10 text-center">
              <div className="text-2xl md:text-4xl font-black tracking-tight">
                <span className="text-yellow-400">"{(result.winner === "A" ? result.a : result.b).tokenIdea}"</span>
                <span className="text-zinc-300"> DESTROYS </span>
                <span className="text-zinc-500 line-through">"{(result.winner === "A" ? result.b : result.a).tokenIdea}"</span>
              </div>
              <div className="mt-3 text-zinc-400 italic max-w-2xl mx-auto">"{result.reason}"</div>
            </div>

            <div className="grid md:grid-cols-2 gap-5 mt-6">
              <ResultCard r={result.a} isWinner={result.winner === "A"} />
              <ResultCard r={result.b} isWinner={result.winner === "B"} />
            </div>

            <button onClick={shareWin} className="mt-6 w-full py-3 rounded-lg bg-white text-black font-mono text-sm hover:bg-zinc-200">
              𝕏 Share the win
            </button>
          </>
        )}
        </>}
      </main>
    </div>
  );
}

function LivePanel({ userName, online, inviting, waitingRoomId, onInvite, onCancelWait }: {
  userName: string | null;
  online: { userName: string; lastSeen: string }[];
  inviting: string | null;
  waitingRoomId: number | null;
  onInvite: (u: string) => void;
  onCancelWait: () => void;
}) {
  const [friends, setFriends] = useState<{ userName: string; online: boolean }[]>([]);
  useEffect(() => {
    if (!userName) return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(`${API}/friends/list/${encodeURIComponent(userName)}`);
        const d = await r.json();
        if (alive) setFriends(d.friends || []);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 15_000);
    return () => { alive = false; clearInterval(id); };
  }, [userName]);

  if (!userName) {
    return <div className="rounded-2xl border border-zinc-800 bg-black/40 p-8 text-center text-zinc-400 font-mono">Set your handle to enter the live arena.</div>;
  }
  if (waitingRoomId) {
    return (
      <div className="rounded-2xl border-2 border-yellow-500/60 bg-gradient-to-br from-yellow-500/10 to-orange-500/5 p-8 text-center">
        <div className="text-5xl mb-3 animate-pulse">📡</div>
        <div className="text-yellow-300 font-mono text-lg">Invite sent to <span className="text-orange-400">@{inviting}</span></div>
        <div className="text-zinc-500 text-xs font-mono mt-1">Waiting for them to accept (30s timeout)...</div>
        <button onClick={onCancelWait} className="mt-5 px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-xs font-mono hover-elevate">Cancel</button>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border-2 border-red-500/40 bg-gradient-to-br from-red-500/5 via-orange-500/5 to-zinc-950 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <h2 className="font-mono uppercase text-sm text-red-300">Live Arena</h2>
        <span className="text-zinc-500 text-xs font-mono ml-auto">{online.length} online now</span>
      </div>
      <p className="text-zinc-400 text-xs font-mono mb-4">Pick an opponent — both write a coin in 60s, AI judges instantly. Winner gets bragging rights + a feed post.</p>

      {friends.length > 0 && (
        <div className="mb-5 rounded-xl border border-pink-500/30 bg-pink-500/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-pink-300 font-mono text-[11px] uppercase">👯 Your Friends</span>
            <span className="text-zinc-600 text-[10px] font-mono ml-auto">
              {friends.filter((f) => f.online).length}/{friends.length} online
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[...friends].sort((a, b) => Number(b.online) - Number(a.online)).slice(0, 9).map((f) => (
              <div key={f.userName} className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${f.online ? "border-pink-500/40 bg-black/40 hover:border-pink-500/60" : "border-zinc-800 bg-black/20"}`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${f.online ? "bg-green-500 animate-pulse" : "bg-zinc-600"}`} />
                <span className={`font-mono text-sm truncate flex-1 ${f.online ? "text-zinc-100" : "text-zinc-500"}`}>@{f.userName}</span>
                <button onClick={() => onInvite(f.userName)} disabled={!!inviting || !f.online}
                  title={f.online ? "Challenge to live battle" : "Friend is offline"}
                  className="px-2.5 py-1 rounded-md bg-pink-500/20 border border-pink-500/50 text-pink-200 text-[11px] font-mono hover:bg-pink-500/30 disabled:opacity-30 shrink-0">
                  ⚔️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-[11px] font-mono uppercase text-red-300 mb-2">🔴 Online Now</div>
      {online.length === 0 ? (
        <div className="text-center py-10">
          <div className="text-3xl mb-2">👻</div>
          <div className="text-zinc-500 font-mono text-sm">Nobody's around right now.</div>
          <div className="text-zinc-600 font-mono text-xs mt-1">Invite a friend or check back in a minute.</div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {online.map((u) => (
            <div key={u.userName} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 hover:border-red-500/40 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <span className="font-mono text-sm text-zinc-200 truncate flex-1">@{u.userName}</span>
              <button onClick={() => onInvite(u.userName)} disabled={!!inviting}
                className="px-2.5 py-1 rounded-md bg-red-500/20 border border-red-500/50 text-red-300 text-[11px] font-mono hover:bg-red-500/30 disabled:opacity-40 shrink-0">
                ⚔️ Challenge
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
