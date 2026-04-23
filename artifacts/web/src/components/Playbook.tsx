import { useState } from "react";

export default function Playbook({ plan }: { plan: Record<string, string> }) {
  const [open, setOpen] = useState(true);
  const days = Object.keys(plan).sort();
  if (days.length === 0) return null;
  return (
    <section className="mt-8 rounded-2xl border border-zinc-800 bg-black/60 p-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between mb-3"
      >
        <h2 className="font-mono uppercase text-sm text-green-400">📅 Your 7-day launch playbook</h2>
        <span className="text-zinc-500 font-mono text-xs">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <ol className="relative border-l-2 border-orange-500/30 ml-3 space-y-3">
          {days.map((d, i) => (
            <li key={d} className="ml-4">
              <div className="absolute -left-[9px] w-4 h-4 rounded-full bg-orange-500/80 border-2 border-black" />
              <div className="flex items-center gap-3">
                <div className="text-xs font-mono text-orange-400 uppercase w-12">Day {i + 1}</div>
                <div className="text-sm text-zinc-200">{plan[d]}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
