export default function Footer() {
  return (
    <footer className="mt-16 border-t border-zinc-800 bg-black/60">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] font-mono text-zinc-500">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-orange-400 font-bold">RoastLaunch</span>
          <span className="text-zinc-700">/v1</span>
          <span className="mx-1 text-zinc-700">·</span>
          <span>The AI launch coach for BNB meme culture</span>
          <span className="mx-1 text-zinc-700">·</span>
          <span>Built for Four.meme AI Sprint 2026</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-orange-500/40 bg-orange-500/10 text-orange-300"
            title="Llama 3.3 70B via Groq powers all roasts, battles & captions — fast and free"
          >
            ⚡ Groq · text
          </span>
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-blue-500/40 bg-blue-500/10 text-blue-300"
            title="Gemini 2.5 Flash Image generates the AI meme art"
          >
            🎨 Gemini · images
          </span>
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
            title="BNB Chain Testnet"
          >
            🟡 BNB Testnet
          </span>
        </div>
      </div>
    </footer>
  );
}
