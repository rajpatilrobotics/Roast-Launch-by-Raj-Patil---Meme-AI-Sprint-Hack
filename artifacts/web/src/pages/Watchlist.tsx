import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { API } from "../lib/api";
import { useUser } from "../context/UserContext";

type WatchlistItem = { id: number; userName: string; coinIdea: string; coinName: string | null; ticker: string | null; createdAt: string };

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Watchlist() {
  const { userName } = useUser();
  const [, navigate] = useLocation();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userName) return;
    fetch(`${API}/watchlist?userName=${encodeURIComponent(userName)}`)
      .then((r) => r.json())
      .then((d) => { setItems(d.items || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userName]);

  async function remove(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`${API}/watchlist/${id}?userName=${encodeURIComponent(userName || "")}`, { method: "DELETE" }).catch(() => {});
  }

  function roastNow(item: WatchlistItem) {
    sessionStorage.setItem("roastlaunch:prefill", JSON.stringify({
      idea: item.coinIdea,
      name: item.coinName || "",
      ticker: item.ticker || "",
    }));
    navigate("/");
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black">
          <span className="text-orange-400">My</span>{" "}
          <span className="text-zinc-300">Watchlist</span>
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Coin ideas you've saved. Roast them whenever you're ready.</p>
      </div>

      {loading && <div className="text-zinc-500 text-sm font-mono text-center py-12">Loading...</div>}

      {!loading && items.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-zinc-500 text-sm font-mono">Your watchlist is empty.</p>
          <p className="text-zinc-600 text-xs mt-1">Save coin ideas from the Community page to roast later.</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-zinc-200 text-sm font-medium">{item.coinIdea}</div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {item.coinName && <span className="text-orange-400 text-xs font-mono">{item.coinName}</span>}
                  {item.ticker && <span className="text-green-400 text-xs font-mono">${item.ticker}</span>}
                  <span className="text-zinc-600 text-[11px]">{timeAgo(item.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => roastNow(item)}
                  className="px-3 py-1.5 rounded-lg bg-orange-500/20 border border-orange-500/50 text-orange-300 text-xs font-mono hover:bg-orange-500/30 transition-colors"
                >
                  🔥 Roast now
                </button>
                <button
                  onClick={() => remove(item.id)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-500 text-xs font-mono hover:text-red-400 hover:border-red-500/40 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
