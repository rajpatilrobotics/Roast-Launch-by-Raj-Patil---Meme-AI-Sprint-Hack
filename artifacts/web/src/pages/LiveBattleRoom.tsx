import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { API, scoreColor, verdictColor, type Roast } from "../lib/api";
import { useUser } from "../context/UserContext";

type Coin = { tokenIdea: string; tokenName?: string; ticker?: string };
type Room = {
  id: number;
  hostUser: string;
  opponentUser: string;
  status: "pending" | "active" | "judging" | "done" | "expired" | "declined" | "error";
  hostCoin: Coin | null;
  opponentCoin: Coin | null;
  result: any | null;
  startedAt: string | null;
  createdAt: string;
};

const SUBMIT_SECONDS = 60;

export default function LiveBattleRoom() {
  const [, params] = useRoute("/battle/live/:id");
  const [, navigate] = useLocation();
  const { userName } = useUser();
  const roomId = params?.id ? Number(params.id) : 0;

  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coin, setCoin] = useState<Coin>({ tokenIdea: "", tokenName: "", ticker: "" });
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  // poll room state
  useEffect(() => {
    if (!roomId) return;
    let alive = true;
    const fetchRoom = async () => {
      try {
        const r = await fetch(`${API}/live-battle/room/${roomId}`);
        const d = await r.json();
        if (!alive) return;
        if (d.error) { setError(d.error); return; }
        setRoom(d.room);
      } catch {}
    };
    fetchRoom();
    const id = setInterval(fetchRoom, 1500);
    return () => { alive = false; clearInterval(id); };
  }, [roomId]);

  // countdown
  const [secondsLeft, setSecondsLeft] = useState(SUBMIT_SECONDS);
  useEffect(() => {
    if (!room || room.status !== "active" || !room.startedAt) return;
    const start = new Date(room.startedAt).getTime();
    const tick = () => {
      const left = Math.max(0, SUBMIT_SECONDS - Math.floor((Date.now() - start) / 1000));
      setSecondsLeft(left);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [room?.status, room?.startedAt]);

  // auto-submit on timeout
  useEffect(() => {
    if (!room || room.status !== "active" || !userName) return;
    if (secondsLeft > 0 || submittedRef.current) return;
    const isHost = room.hostUser === userName;
    const mine = isHost ? room.hostCoin : room.opponentCoin;
    if (mine) return;
    const idea = coin.tokenIdea.trim() || "(player ran out of time and submitted nothing)";
    void submit({ ...coin, tokenIdea: idea });
  }, [secondsLeft, room?.status]);

  async function submit(c?: Coin) {
    const payload = c || coin;
    if (!room || !userName || submittedRef.current || submitting) return;
    if (!payload.tokenIdea.trim()) return;
    setSubmitting(true);
    submittedRef.current = true;
    try {
      const r = await fetch(`${API}/live-battle/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id, userName, coin: payload }),
      });
      const d = await r.json();
      if (d.room) setRoom(d.room);
    } catch {} finally { setSubmitting(false); }
  }

  if (!userName) {
    return <main className="max-w-4xl mx-auto px-4 py-12 text-center text-zinc-400">Set your handle to join a live battle.</main>;
  }
  if (error) {
    return <main className="max-w-4xl mx-auto px-4 py-12 text-center text-red-400 font-mono">{error}</main>;
  }
  if (!room) {
    return <main className="max-w-4xl mx-auto px-4 py-12 text-center text-zinc-500 font-mono">Loading room...</main>;
  }

  const isHost = room.hostUser === userName;
  const isOpp = room.opponentUser === userName;
  const isParticipant = isHost || isOpp;
  const mineSubmitted = isHost ? !!room.hostCoin : isOpp ? !!room.opponentCoin : false;
  const otherSubmitted = isHost ? !!room.opponentCoin : isOpp ? !!room.hostCoin : false;
  const otherUser = isHost ? room.opponentUser : room.hostUser;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 scanline min-h-screen">
      <div className="text-center mb-6">
        <div className="inline-block text-[10px] font-mono uppercase px-3 py-1 rounded-full bg-red-500/20 border border-red-500/50 text-red-300 mb-2 animate-pulse">
          🔴 LIVE BATTLE
        </div>
        <h1 className="text-2xl md:text-4xl font-black tracking-tight">
          <span className="text-orange-400">@{room.hostUser}</span>
          <span className="text-zinc-500"> vs </span>
          <span className="text-purple-400">@{room.opponentUser}</span>
        </h1>
      </div>

      {room.status === "pending" && (
        <div className="text-center py-16 text-zinc-400 font-mono">Waiting for @{room.opponentUser} to accept...</div>
      )}

      {(room.status === "declined" || room.status === "expired") && (
        <div className="text-center py-16">
          <div className="text-3xl mb-3">{room.status === "declined" ? "🚫" : "⏱️"}</div>
          <div className="text-zinc-300 font-mono">
            {room.status === "declined" ? `@${room.opponentUser} declined the battle.` : "Invite expired."}
          </div>
          <Link href="/battle" className="inline-block mt-5 px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm hover-elevate">← Back to Battle</Link>
        </div>
      )}

      {room.status === "active" && isParticipant && (
        <>
          <div className="text-center mb-5">
            <div className={`inline-block text-3xl font-black font-mono px-4 py-2 rounded-xl border-2 ${secondsLeft <= 10 ? "border-red-500/70 text-red-400 animate-pulse" : "border-yellow-500/60 text-yellow-300"}`}>
              ⏱ {secondsLeft}s
            </div>
            <div className="text-zinc-500 text-xs font-mono mt-2">Write your coin pitch — fastest finger fights</div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Mine */}
            <div className="rounded-2xl border-2 border-green-500/60 bg-black/60 p-5">
              <div className="font-mono uppercase text-xs text-green-400 mb-3">YOU (@{userName})</div>
              {mineSubmitted ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">✅</div>
                  <div className="text-green-400 font-mono text-sm">Submitted!</div>
                  <div className="text-zinc-500 text-xs mt-1">Waiting on @{otherUser}...</div>
                </div>
              ) : (
                <>
                  <textarea value={coin.tokenIdea} onChange={(e) => setCoin({ ...coin, tokenIdea: e.target.value })}
                    placeholder="describe your meme coin..." rows={4} maxLength={300}
                    className="w-full bg-black/60 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-green-500 resize-none" />
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input value={coin.tokenName || ""} onChange={(e) => setCoin({ ...coin, tokenName: e.target.value })}
                      placeholder="Name" maxLength={30}
                      className="bg-black/60 border border-zinc-800 rounded-lg p-2 text-xs" />
                    <input value={coin.ticker || ""} onChange={(e) => setCoin({ ...coin, ticker: e.target.value.toUpperCase() })}
                      placeholder="TICKER" maxLength={10}
                      className="bg-black/60 border border-zinc-800 rounded-lg p-2 text-xs font-mono" />
                  </div>
                  <button onClick={() => submit()} disabled={!coin.tokenIdea.trim() || submitting}
                    className="mt-3 w-full py-2.5 rounded-lg bg-green-500/20 border border-green-500/50 text-green-300 font-mono text-sm uppercase tracking-wider hover:bg-green-500/30 disabled:opacity-40">
                    {submitting ? "Locking in..." : "🔒 Lock in"}
                  </button>
                </>
              )}
            </div>

            {/* Theirs */}
            <div className="rounded-2xl border-2 border-purple-500/60 bg-black/60 p-5">
              <div className="font-mono uppercase text-xs text-purple-400 mb-3">@{otherUser}</div>
              {otherSubmitted ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">✅</div>
                  <div className="text-purple-400 font-mono text-sm">Locked in</div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2 animate-bounce">⌨️</div>
                  <div className="text-zinc-500 font-mono text-sm">Typing...</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {room.status === "judging" && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4 animate-spin inline-block">⚖️</div>
          <div className="text-yellow-300 font-mono text-lg">AI judges deliberating...</div>
          <div className="text-zinc-500 text-xs font-mono mt-2">Both coins locked in. Verdict incoming.</div>
        </div>
      )}

      {room.status === "done" && room.result && (
        <Verdict room={room} userName={userName} />
      )}

      {room.status === "error" && (
        <div className="text-center py-16 text-red-400 font-mono">Battle errored: {room.result?.error || "unknown"}</div>
      )}
    </main>
  );
}

function Verdict({ room, userName }: { room: Room; userName: string }) {
  const r = room.result as { a: Roast; b: Roast; winner: "A" | "B"; reason: string; winnerUser: string; loserUser: string };
  const youWon = r.winnerUser === userName;
  const isParticipant = userName === room.hostUser || userName === room.opponentUser;

  return (
    <>
      <div className="text-center mb-6 mt-4">
        {isParticipant && (
          <div className={`text-5xl md:text-7xl font-black mb-2 ${youWon ? "text-yellow-400" : "text-zinc-500"}`}>
            {youWon ? "🏆 YOU WON" : "💀 You lost"}
          </div>
        )}
        <div className="text-xl md:text-3xl font-black tracking-tight mt-3">
          <span className="text-yellow-400">@{r.winnerUser}</span>
          <span className="text-zinc-300"> destroys </span>
          <span className="text-zinc-500 line-through">@{r.loserUser}</span>
        </div>
        <div className="mt-3 text-zinc-400 italic max-w-2xl mx-auto">"{r.reason}"</div>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mt-6">
        <RoastCard r={r.a} user={room.hostUser} won={r.winner === "A"} />
        <RoastCard r={r.b} user={room.opponentUser} won={r.winner === "B"} />
      </div>

      <div className="flex gap-3 mt-6 flex-wrap justify-center">
        <Link href="/battle" className="px-5 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 font-mono text-sm hover-elevate">← Back to Battle</Link>
        <button onClick={() => {
          const text = `🔴 LIVE roast battle on RoastLaunch:\n@${r.winnerUser} just KO'd @${r.loserUser} 🥊\n"${r.reason}"`;
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=RoastLaunch,FourMeme`, "_blank");
        }} className="px-5 py-2.5 rounded-lg bg-white text-black font-mono text-sm hover:bg-zinc-200">𝕏 Share KO</button>
      </div>
    </>
  );
}

function RoastCard({ r, user, won }: { r: Roast; user: string; won: boolean }) {
  return (
    <div className={`rounded-2xl border-2 p-5 ${won ? "border-yellow-500/80" : "border-zinc-800 opacity-80"}`}>
      <div className="text-[11px] font-mono uppercase text-zinc-500 mb-1">@{user}</div>
      {won && <div className="text-center text-2xl mb-1">🏆 WINNER</div>}
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
