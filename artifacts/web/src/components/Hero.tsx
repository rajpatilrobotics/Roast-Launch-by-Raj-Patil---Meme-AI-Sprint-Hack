import { useEffect, useState } from "react";
import { API } from "../lib/api";

const SYMBOLS = ["🪙", "💎", "🚀", "🐸", "🐂", "🧠", "🔥"];

export default function Hero() {
  const [count, setCount] = useState(0);
  const [particles] = useState(() =>
    Array.from({ length: 18 }, () => ({
      symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 14 + Math.random() * 10,
      size: 14 + Math.random() * 18,
    })),
  );

  useEffect(() => {
    fetch(`${API}/history`)
      .then((r) => r.json())
      .then((d) => setCount(d.todayCount || 0))
      .catch(() => {});
  }, []);

  return (
    <section className="relative overflow-hidden hero-bg border-b border-orange-500/20">
      <div className="absolute inset-0 pointer-events-none z-0 opacity-40">
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute float-up"
            style={{
              left: `${p.left}%`,
              fontSize: `${p.size}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          >
            {p.symbol}
          </span>
        ))}
      </div>
      <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 py-12 md:py-20 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-56 h-56 md:w-72 md:h-72 rounded-[2.25rem] overflow-hidden logo-pulse drop-shadow-[0_0_40px_rgba(249,115,22,0.45)]">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="RoastLaunch"
              className="w-full h-full object-cover scale-[1.08]"
            />
          </div>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/40 bg-black/60 text-orange-300 text-[11px] font-mono mb-5">
          🔥 {count} coins roasted today · live on BNB
        </div>
        <h1 className="font-black tracking-tight leading-[1.1] max-w-5xl mx-auto text-balance">
          <span className="block text-2xl sm:text-3xl md:text-5xl whitespace-nowrap">
            <span className="text-orange-400">97%</span> of meme coins die in <span className="text-red-400">48 hours.</span>
          </span>
          <span className="block mt-3 text-2xl sm:text-3xl md:text-5xl text-zinc-100">
            Don't be one of them.
          </span>
        </h1>
        <p className="mt-5 md:mt-6 text-zinc-200 max-w-3xl mx-auto text-base md:text-lg leading-relaxed text-balance">
          RoastLaunch is the AI launch coach for meme coins.
          <br />
          Three AI judges stress-test your idea, score it out of 100,
          <br />
          and tell you exactly how to fix it — <span className="text-orange-300 font-semibold whitespace-nowrap">in 30 seconds</span>, before you spend a dollar.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs md:text-sm text-zinc-300">
          <span className="inline-flex items-center gap-1.5"><span className="text-green-400 text-base">①</span> Describe your coin</span>
          <span className="text-zinc-700">→</span>
          <span className="inline-flex items-center gap-1.5"><span className="text-orange-400 text-base">②</span> AI panel roasts it</span>
          <span className="text-zinc-700">→</span>
          <span className="inline-flex items-center gap-1.5"><span className="text-yellow-400 text-base">③</span> Launch on Four.meme</span>
        </div>
        <div className="mt-7 flex items-center justify-center gap-x-3 gap-y-2 text-[11px] font-mono text-zinc-500 flex-wrap">
          <span className="inline-flex items-center gap-1.5"><span className="text-green-400">●</span> BNB Testnet Live</span>
          <span className="text-zinc-700">·</span>
          <span>⚡ Powered by Groq</span>
          <span className="text-zinc-700">·</span>
          <span>Built for Four.meme AI Sprint</span>
        </div>
      </div>
    </section>
  );
}
