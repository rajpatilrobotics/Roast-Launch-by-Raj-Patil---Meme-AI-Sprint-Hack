import { useEffect, useRef, useState } from "react";
import { API } from "../../lib/api";

type ChatMsg = { id: number; userName: string; message: string; createdAt: string };

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

export default function ChatPanel({ userName, open, onClose }: { userName: string; open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  function scrollBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    if (!open) return;
    let alive = true;
    async function poll() {
      try {
        const r = await fetch(`${API}/chat`);
        const d = await r.json();
        if (alive) setMessages(d.messages || []);
      } catch {}
    }
    poll();
    const id = setInterval(poll, 4000);
    return () => { alive = false; clearInterval(id); };
  }, [open]);

  useEffect(() => { scrollBottom(); }, [messages, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || sending) return;
    setSending(true);
    setInput("");
    try {
      await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, message: msg }),
      });
      const r = await fetch(`${API}/chat`);
      const d = await r.json();
      setMessages(d.messages || []);
    } catch {} finally { setSending(false); }
  }

  if (!open) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 w-80 max-h-[480px] flex flex-col bg-zinc-950 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-black/60">
        <span className="font-mono text-xs uppercase text-orange-400 font-bold">💬 Shoutbox</span>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 text-sm">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0" style={{ maxHeight: 340 }}>
        {messages.length === 0 && (
          <p className="text-zinc-600 text-xs text-center py-6">No messages yet. Say something!</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="flex gap-2 items-start">
            <span className={`font-mono text-[11px] font-bold shrink-0 ${m.userName === userName ? "text-green-400" : m.userName === "🤖 RoastBot" ? "text-orange-400" : "text-zinc-400"}`}>
              {m.userName}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-zinc-200 break-words">{m.message}</span>
              <span className="text-[10px] text-zinc-600 ml-1">{timeAgo(m.createdAt)}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="border-t border-zinc-800 p-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="say something..."
          maxLength={200}
          className="flex-1 bg-black border border-zinc-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-orange-500 text-zinc-100"
        />
        <button type="submit" disabled={!input.trim() || sending}
          className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-black text-xs font-bold">
          Send
        </button>
      </form>
    </div>
  );
}
