import { useEffect, useRef, useState } from "react";
import { API } from "../lib/api";

type Msg = { id: number; fromUser: string; body: string; createdAt: string; readByOther: number };

function timeShort(d: string) {
  const dt = new Date(d);
  return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function DMPanel({
  userName,
  otherUser,
  onClose,
}: {
  userName: string;
  otherUser: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastTypingSentRef = useRef(0);

  async function load() {
    try {
      const r = await fetch(
        `${API}/dm/messages?userName=${encodeURIComponent(userName)}&otherUser=${encodeURIComponent(otherUser)}`,
      );
      const d = await r.json();
      if (d.error) {
        setError(d.error);
      } else {
        setMessages(d.messages || []);
        setError(null);
      }
    } catch {}
  }

  async function pollTyping() {
    try {
      const r = await fetch(
        `${API}/dm/typing?userName=${encodeURIComponent(userName)}&otherUser=${encodeURIComponent(otherUser)}`,
      );
      const d = await r.json();
      setOtherTyping(!!d.typing);
    } catch {}
  }

  useEffect(() => {
    load();
    pollTyping();
    const id = setInterval(() => { load(); pollTyping(); }, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName, otherUser]);

  function notifyTyping() {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;
    fetch(`${API}/dm/typing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUser: userName, toUser: otherUser }),
    }).catch(() => {});
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, otherTyping]);

  async function send() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    const optimistic: Msg = {
      id: -Date.now(),
      fromUser: userName,
      body: text,
      createdAt: new Date().toISOString(),
      readByOther: 0,
    };
    setMessages((m) => [...m, optimistic]);
    setBody("");
    try {
      const r = await fetch(`${API}/dm/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromUser: userName, toUser: otherUser, body: text }),
      });
      const d = await r.json();
      if (d.error) setError(d.error);
      load();
    } catch {}
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full md:max-w-lg md:rounded-2xl rounded-t-2xl border border-blue-500/30 bg-gradient-to-b from-zinc-950 to-black shadow-2xl flex flex-col h-[80vh] md:h-[600px] overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-3 bg-black/60">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border border-blue-500/40 flex items-center justify-center font-bold text-blue-200">
            {otherUser.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-sm text-zinc-100 font-bold truncate">
              💬 @{otherUser}
            </div>
            <div className="text-[10px] font-mono text-zinc-500">friends-only DM</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-500/40 font-mono"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
          {error && (
            <div className="text-center text-red-400 text-xs font-mono py-3">{error}</div>
          )}
          {!error && messages.length === 0 && (
            <div className="text-center text-zinc-600 text-xs font-mono py-10">
              No messages yet. Say something. 👋
            </div>
          )}
          {messages.map((m) => {
            const mine = m.fromUser === userName;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                    mine
                      ? "bg-blue-500/80 text-white rounded-br-sm"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-sm"
                  }`}
                >
                  <div className="text-sm leading-snug whitespace-pre-wrap break-words">{m.body}</div>
                  <div className={`text-[9px] font-mono mt-1 ${mine ? "text-blue-100/80" : "text-zinc-500"}`}>
                    {timeShort(m.createdAt)}
                    {mine && (m.readByOther ? " · seen" : " · sent")}
                  </div>
                </div>
              </div>
            );
          })}
          {otherTyping && (
            <div className="flex justify-start">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-300/80 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-blue-300/80 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-blue-300/80 animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-[10px] font-mono text-zinc-500 ml-1">@{otherUser} is typing</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 p-3 bg-black/60">
          <div className="flex items-center gap-2">
            <input
              value={body}
              onChange={(e) => { setBody(e.target.value); if (e.target.value.trim()) notifyTyping(); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={`Message @${otherUser}...`}
              className="flex-1 bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              maxLength={1000}
              autoFocus
            />
            <button
              onClick={send}
              disabled={!body.trim() || sending}
              className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white font-bold text-sm"
            >
              {sending ? "..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
