import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { API, type TrendingCoin } from "../lib/api";

export default function TrendingFeed() {
  const [coins, setCoins] = useState<TrendingCoin[]>([]);
  const [meta, setMeta] = useState<string>("...");
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    let alive = true;
    function load() {
      fetch(`${API}/trending`)
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return;
          setCoins(Array.isArray(d.coins) ? d.coins : []);
          setMeta(d.meta || "Degen humor");
          setLoading(false);
        })
        .catch(() => alive && setLoading(false));
    }
    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  function roastThis(c: TrendingCoin) {
    sessionStorage.setItem(
      "roastlaunch:prefill",
      JSON.stringify({
        idea: c.description || `A meme coin called ${c.name} trending on Four.meme`,
        name: c.name,
        ticker: c.symbol || "",
      }),
    );
    navigate("/");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  }

  return (
    <section className="mt-10" data-testid="trending-feed">
      <div className="flex items-end justify-between mb-3 gap-3 flex-wrap">
        <h2 className="font-mono uppercase text-sm text-zinc-400">
          🌶️ Live on Four.meme · <span className="text-orange-400">{meta}</span>
        </h2>
        <span className="text-[10px] font-mono text-zinc-600">refreshes every 60s</span>
      </div>

      {loading && coins.length === 0 ? (
        <div className="text-zinc-600 text-sm font-mono">Loading live feed...</div>
      ) : coins.length === 0 ? (
        <div className="text-zinc-600 text-sm font-mono">No live data right now.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {coins.map((c, i) => (
            <div
              key={`${c.symbol}-${i}`}
              className="rounded-xl border border-zinc-800 bg-black/40 p-3 flex flex-col gap-2 hover:border-orange-500/40 transition-colors"
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-bold text-sm text-zinc-100 truncate">{c.name}</div>
                {c.symbol && (
                  <div className="font-mono text-xs text-orange-400 shrink-0">${c.symbol}</div>
                )}
              </div>
              {c.description && (
                <div className="text-[11px] text-zinc-400 line-clamp-2">{c.description}</div>
              )}
              <button
                onClick={() => roastThis(c)}
                className="self-start mt-1 px-3 py-1.5 rounded-full border border-orange-500/60 bg-orange-500/10 text-orange-300 text-xs font-mono hover-elevate"
                data-testid={`roast-this-${c.symbol || i}`}
              >
                🔥 Roast this coin
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
