import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { API } from "../lib/api";
import { useUser } from "../context/UserContext";

type Invite = {
  id: number;
  hostUser: string;
  opponentUser: string;
  status: string;
  createdAt: string;
};

const PING_INTERVAL_MS = 15_000;
const INBOX_INTERVAL_MS = 4_000;

export default function LiveBattleManager() {
  const { userName } = useUser();
  const [, navigate] = useLocation();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [responding, setResponding] = useState(false);
  const dismissedRef = useRef<Set<number>>(new Set());

  // presence ping
  useEffect(() => {
    if (!userName) return;
    const ping = () => {
      fetch(`${API}/presence/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName }),
      }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, PING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [userName]);

  // inbox poll
  useEffect(() => {
    if (!userName) return;
    let alive = true;
    const fetchInbox = async () => {
      try {
        const r = await fetch(`${API}/live-battle/inbox?userName=${encodeURIComponent(userName)}`);
        const d = await r.json();
        if (!alive) return;
        const incoming: Invite[] = d.invites || [];
        const fresh = incoming.find((i) => !dismissedRef.current.has(i.id));
        if (fresh && (!invite || invite.id !== fresh.id)) {
          setInvite(fresh);
        } else if (!fresh && invite && !incoming.find((i) => i.id === invite.id)) {
          setInvite(null);
        }
      } catch {}
    };
    fetchInbox();
    const id = setInterval(fetchInbox, INBOX_INTERVAL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [userName, invite]);

  // 30s expiry timer
  const [secondsLeft, setSecondsLeft] = useState(30);
  useEffect(() => {
    if (!invite) return;
    const start = new Date(invite.createdAt).getTime();
    const tick = () => {
      const left = Math.max(0, 30 - Math.floor((Date.now() - start) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        dismissedRef.current.add(invite.id);
        setInvite(null);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [invite]);

  async function respond(accept: boolean) {
    if (!invite || !userName || responding) return;
    setResponding(true);
    try {
      const r = await fetch(`${API}/live-battle/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: invite.id, userName, accept }),
      });
      const d = await r.json();
      dismissedRef.current.add(invite.id);
      setInvite(null);
      if (accept && d.room?.id) {
        navigate(`/battle/live/${d.room.id}`);
      }
    } catch {} finally { setResponding(false); }
  }

  if (!invite || !userName) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-md">
      <div className="rounded-2xl border-2 border-yellow-500/70 bg-gradient-to-br from-yellow-500/15 via-orange-500/10 to-red-500/10 backdrop-blur-md p-4 shadow-2xl shadow-yellow-500/20 animate-pulse">
        <div className="flex items-start gap-3">
          <div className="text-3xl shrink-0">⚔️</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono uppercase text-yellow-300 mb-1">Live Battle Invite · {secondsLeft}s</div>
            <div className="text-zinc-100 font-bold">
              <span className="text-orange-400">@{invite.hostUser}</span> wants to battle you LIVE
            </div>
            <div className="text-zinc-500 text-[11px] font-mono mt-0.5">60s to write your coin · AI judges instantly</div>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => respond(true)} disabled={responding}
            className="flex-1 py-2 rounded-lg bg-green-500/20 border border-green-500/60 text-green-300 text-sm font-mono uppercase tracking-wider hover:bg-green-500/30 disabled:opacity-50">
            ✓ Accept
          </button>
          <button onClick={() => respond(false)} disabled={responding}
            className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm font-mono uppercase tracking-wider hover:border-zinc-500">
            ✕ Decline
          </button>
        </div>
      </div>
    </div>
  );
}
