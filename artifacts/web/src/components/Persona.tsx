import { useEffect, useState } from "react";

function TypingDots() {
  return (
    <span className="text-current">
      <span className="dot">•</span>
      <span className="dot">•</span>
      <span className="dot">•</span>
    </span>
  );
}

export default function Persona({
  title,
  subtitle,
  emoji,
  color,
  glow,
  meterColor,
  text,
  loading,
}: {
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
  glow: string;
  meterColor: string;
  text: string;
  loading: boolean;
}) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    if (loading || !text) {
      setShown("");
      return;
    }
    const words = text.split(" ");
    let i = 0;
    setShown("");
    const id = setInterval(() => {
      i++;
      setShown(words.slice(0, i).join(" "));
      if (i >= words.length) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [text, loading]);

  const meterPct = loading ? 30 : text ? Math.min(100, (shown.length / Math.max(1, text.length)) * 100) : 0;

  return (
    <div
      className={`rounded-xl border-2 ${color} ${glow} bg-black/60 p-5 flex flex-col min-h-[260px] backdrop-blur-sm relative`}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-3xl">{emoji}</div>
          <h3 className="font-mono uppercase tracking-wider text-sm font-bold mt-1">{title}</h3>
          <div className="text-[10px] font-mono text-zinc-500 uppercase">{subtitle}</div>
        </div>
      </div>
      <div className="h-1 bg-zinc-900 rounded-full overflow-hidden mb-3">
        <div className={`h-full ${meterColor} transition-all duration-500`} style={{ width: `${meterPct}%` }} />
      </div>
      <div className="text-sm leading-relaxed text-zinc-100 flex-1 whitespace-pre-wrap">
        {loading ? <TypingDots /> : shown}
      </div>
    </div>
  );
}
