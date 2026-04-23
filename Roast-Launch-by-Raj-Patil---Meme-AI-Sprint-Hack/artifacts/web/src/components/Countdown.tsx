import { useEffect, useState } from "react";
import { Sound } from "../lib/sounds";

export default function Countdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);
  const [stage, setStage] = useState<"count" | "fire" | "done">("count");

  useEffect(() => {
    if (stage === "done") return;
    if (stage === "count") {
      Sound.tick();
      if (n === 0) {
        setStage("fire");
        return;
      }
      const id = setTimeout(() => setN((v) => v - 1), 700);
      return () => clearTimeout(id);
    }
    Sound.fire();
    const id = setTimeout(() => {
      setStage("done");
      onDone();
    }, 700);
    return () => clearTimeout(id);
  }, [n, stage, onDone]);

  if (stage === "done") return null;
  return (
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center">
        {stage === "count" ? (
          <div
            key={n}
            className="text-[140px] md:text-[200px] font-black font-mono text-orange-400 animate-ping-once"
            style={{ animation: "scaleIn 0.7s ease-out" }}
          >
            {n === 0 ? "🔥" : n}
          </div>
        ) : (
          <div className="text-5xl md:text-7xl font-black tracking-wider text-green-400 animate-pulse">
            🔥 ROASTING
          </div>
        )}
      </div>
    </div>
  );
}
