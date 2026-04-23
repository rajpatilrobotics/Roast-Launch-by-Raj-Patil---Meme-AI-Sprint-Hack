import { useEffect, useState } from "react";

export default function Confetti({ kind, onDone }: { kind: "wagmi" | "ngmi" | "dyor"; onDone?: () => void }) {
  const [pieces] = useState(() =>
    Array.from({ length: kind === "wagmi" ? 80 : kind === "ngmi" ? 40 : 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 1.8 + Math.random() * 1.6,
      rotate: Math.random() * 360,
      symbol:
        kind === "wagmi"
          ? ["🎉", "🚀", "💎", "🟢", "🐂"][Math.floor(Math.random() * 5)]
          : kind === "ngmi"
            ? ["💀", "🩸", "📉", "🔻"][Math.floor(Math.random() * 4)]
            : ["⚠️", "🟡", "🟠"][Math.floor(Math.random() * 3)],
    })),
  );

  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute text-2xl"
          style={{
            left: `${p.left}%`,
            top: "-30px",
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        >
          {p.symbol}
        </div>
      ))}
    </div>
  );
}
