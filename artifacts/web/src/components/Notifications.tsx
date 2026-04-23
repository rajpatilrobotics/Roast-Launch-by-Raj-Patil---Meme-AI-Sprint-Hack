import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { API } from "../lib/api";
import { useUser } from "../context/UserContext";
import { Sound } from "../lib/sounds";

type Toast = {
  id: number;
  kind: "friend_request" | "friend_accepted" | "dm";
  fromUser: string;
  body?: string;
};

const SEEN_FR_KEY = "rl_seen_friend_requests";
const SEEN_FA_KEY = "rl_seen_friend_accepted";
const SEEN_DM_KEY = "rl_seen_dm_ids";

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}
function writeSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...set].slice(-200)));
  } catch {}
}

export default function Notifications() {
  const { userName } = useUser();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenFR = useRef<Set<string>>(new Set());
  const seenFA = useRef<Set<string>>(new Set());
  const seenDM = useRef<Set<string>>(new Set());
  const seededRef = useRef(false);
  const idRef = useRef(1);
  const lastUserRef = useRef<string | null>(null);

  function push(t: Omit<Toast, "id">) {
    const id = idRef.current++;
    setToasts((prev) => [...prev, { ...t, id }]);
    Sound.click();
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 6500);
  }

  useEffect(() => {
    if (!userName) return;
    if (lastUserRef.current !== userName) {
      lastUserRef.current = userName;
      seenFR.current = readSet(`${SEEN_FR_KEY}:${userName}`);
      seenFA.current = readSet(`${SEEN_FA_KEY}:${userName}`);
      seenDM.current = readSet(`${SEEN_DM_KEY}:${userName}`);
      seededRef.current = false;
    }

    let alive = true;
    let prevOutgoing: Set<string> = new Set();

    const tick = async () => {
      try {
        const [reqRes, convRes] = await Promise.all([
          fetch(`${API}/friends/requests/${encodeURIComponent(userName)}`).then((r) => r.json()),
          fetch(`${API}/dm/conversations/${encodeURIComponent(userName)}`).then((r) => r.json()),
        ]);
        if (!alive) return;

        const incoming: { userName: string }[] = reqRes.incoming || [];
        const outgoing: { userName: string }[] = reqRes.outgoing || [];
        const conversations: any[] = convRes.conversations || [];

        if (!seededRef.current) {
          // First poll: mark current state as seen so we don't blast toasts on login.
          incoming.forEach((r) => seenFR.current.add(r.userName));
          conversations.forEach((c) => {
            if (c.lastMessage) seenDM.current.add(`${c.otherUser}:${c.lastMessage.createdAt}`);
            // anything currently friends with no pending outgoing means we won't toast accepts
            seenFA.current.add(c.otherUser);
          });
          prevOutgoing = new Set(outgoing.map((r) => r.userName));
          writeSet(`${SEEN_FR_KEY}:${userName}`, seenFR.current);
          writeSet(`${SEEN_DM_KEY}:${userName}`, seenDM.current);
          writeSet(`${SEEN_FA_KEY}:${userName}`, seenFA.current);
          seededRef.current = true;
          return;
        }

        // New incoming friend requests
        for (const r of incoming) {
          if (!seenFR.current.has(r.userName)) {
            seenFR.current.add(r.userName);
            push({ kind: "friend_request", fromUser: r.userName });
          }
        }
        writeSet(`${SEEN_FR_KEY}:${userName}`, seenFR.current);

        // Outgoing requests that disappeared and now show as friends → accepted!
        const currOutgoing = new Set(outgoing.map((r) => r.userName));
        for (const wasOut of prevOutgoing) {
          if (!currOutgoing.has(wasOut)) {
            // Check if they're now friends (in conversations list)
            const becameFriend = conversations.some((c) => c.otherUser === wasOut);
            if (becameFriend && !seenFA.current.has(wasOut)) {
              seenFA.current.add(wasOut);
              push({ kind: "friend_accepted", fromUser: wasOut });
            }
          }
        }
        prevOutgoing = currOutgoing;
        writeSet(`${SEEN_FA_KEY}:${userName}`, seenFA.current);

        // New DMs
        for (const c of conversations) {
          if (!c.lastMessage) continue;
          if (c.lastMessage.fromUser === userName) continue;
          const key = `${c.otherUser}:${c.lastMessage.createdAt}`;
          if (!seenDM.current.has(key)) {
            seenDM.current.add(key);
            // only toast if actually unread
            if (c.unread > 0) {
              push({ kind: "dm", fromUser: c.otherUser, body: c.lastMessage.body });
            }
          }
        }
        writeSet(`${SEEN_DM_KEY}:${userName}`, seenDM.current);
      } catch {}
    };

    tick();
    const id = setInterval(tick, 8000);
    return () => { alive = false; clearInterval(id); };
  }, [userName]);

  if (!userName || toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-3 md:right-6 z-50 flex flex-col gap-2 w-[88vw] max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => setToasts((p) => p.filter((x) => x.id !== t.id))} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [enter, setEnter] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEnter(true), 10);
    return () => clearTimeout(t);
  }, []);

  const cfg =
    toast.kind === "friend_request"
      ? {
          icon: "👯",
          title: "New friend request",
          accent: "border-pink-500/50 bg-gradient-to-br from-pink-500/15 to-purple-500/10",
          textAccent: "text-pink-200",
          href: "/friends",
          cta: "View",
        }
      : toast.kind === "friend_accepted"
      ? {
          icon: "🎉",
          title: "Friend request accepted",
          accent: "border-green-500/50 bg-gradient-to-br from-green-500/15 to-emerald-500/10",
          textAccent: "text-green-200",
          href: `/u/${toast.fromUser}`,
          cta: "Say hi",
        }
      : {
          icon: "💬",
          title: "New message",
          accent: "border-blue-500/50 bg-gradient-to-br from-blue-500/15 to-cyan-500/10",
          textAccent: "text-blue-200",
          href: `/u/${toast.fromUser}?dm=1`,
          cta: "Reply",
        };

  return (
    <div
      className={`pointer-events-auto rounded-2xl border ${cfg.accent} backdrop-blur-md shadow-2xl shadow-black/60 px-4 py-3 transition-all duration-300 ${
        enter ? "translate-x-0 opacity-100" : "translate-x-12 opacity-0"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0 mt-0.5">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <div className={`text-[10px] font-mono uppercase tracking-wider ${cfg.textAccent}`}>{cfg.title}</div>
          <div className="font-mono text-sm text-zinc-100 truncate">
            <span className="text-orange-400">@</span>{toast.fromUser}
          </div>
          {toast.body && (
            <div className="text-xs text-zinc-300 mt-1 line-clamp-2 italic">"{toast.body}"</div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Link
              href={cfg.href}
              onClick={onDismiss}
              className={`px-3 py-1 rounded-lg border text-[11px] font-mono font-bold ${cfg.textAccent} border-current hover:bg-white/5`}
            >
              {cfg.cta}
            </Link>
            <button
              onClick={onDismiss}
              className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 px-2"
            >
              dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
