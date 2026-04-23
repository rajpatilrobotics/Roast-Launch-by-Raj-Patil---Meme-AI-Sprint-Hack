import { useRef } from "react";
import { toPng } from "html-to-image";

export default function MemeCards({ tokenName, memeTexts }: { tokenName: string; memeTexts: string[] }) {
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

  if (!memeTexts || memeTexts.length === 0) return null;

  async function download(i: number) {
    const node = cardRefs.current[i];
    if (!node) return;
    try {
      const dataUrl = await toPng(node, {
        backgroundColor: "#000000",
        pixelRatio: 2,
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.download = `roastlaunch-meme-${i + 1}.png`;
      a.href = dataUrl;
      a.click();
    } catch (e) {
      console.error("download failed:", e);
    }
  }

  function shareX(i: number) {
    const text = `${memeTexts[i]} — built on RoastLaunch 🔥 #RoastLaunch #FourMeme #BNBChain`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <section className="mt-10">
      <h2 className="font-mono uppercase text-sm text-orange-400 mb-3">
        🎭 Meme caption cards for your token
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {memeTexts.map((m, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
            <div
              ref={(el) => { cardRefs.current[i] = el; }}
              className="aspect-square bg-black rounded-lg flex flex-col justify-between border border-orange-500/30 relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-orange-500/30 to-green-500/20 pointer-events-none" />
              <div className="relative p-5 text-white font-black text-2xl tracking-tight uppercase leading-tight">
                {tokenName || "YOUR COIN"}
              </div>
              <div className="relative px-5 text-orange-300 font-bold text-lg leading-snug">
                {m}
              </div>
              <div className="relative px-5 pb-5 text-[10px] font-mono text-zinc-500 mt-2">
                roastlaunch · BNB Chain
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => download(i)}
                className="py-2 rounded border border-green-500/50 text-green-400 font-mono text-xs hover-elevate"
                title="Download card as PNG"
              >
                ⬇ Download
              </button>
              <button
                onClick={() => shareX(i)}
                className="py-2 rounded bg-white text-black font-mono text-xs hover:bg-zinc-200"
              >
                𝕏 Share
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
