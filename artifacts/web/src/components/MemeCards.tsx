import { useRef, useState } from "react";
import { toPng } from "html-to-image";

export default function MemeCards({ tokenName, memeTexts }: { tokenName: string; memeTexts: string[] }) {
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [busyIdx, setBusyIdx] = useState<number | null>(null);

  if (!memeTexts || memeTexts.length === 0) return null;

  async function renderPng(i: number): Promise<string | null> {
    const node = cardRefs.current[i];
    if (!node) return null;
    return await toPng(node, {
      backgroundColor: "#000000",
      pixelRatio: 2,
      cacheBust: true,
    });
  }

  async function download(i: number) {
    setBusyIdx(i);
    try {
      const dataUrl = await renderPng(i);
      if (!dataUrl) return;
      const a = document.createElement("a");
      a.download = `roastlaunch-meme-${i + 1}.png`;
      a.href = dataUrl;
      a.click();
    } catch (e) {
      console.error("download failed:", e);
    } finally {
      setBusyIdx(null);
    }
  }

  async function copyToClipboard(i: number) {
    setBusyIdx(i);
    try {
      const dataUrl = await renderPng(i);
      if (!dataUrl) return;
      const blob = await (await fetch(dataUrl)).blob();
      // @ts-ignore — ClipboardItem is widely supported in modern browsers
      if (navigator.clipboard && typeof window.ClipboardItem !== "undefined") {
        // @ts-ignore
        await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
        setCopiedIdx(i);
        setTimeout(() => setCopiedIdx((c) => (c === i ? null : c)), 1800);
      } else {
        // Fallback — copy the caption text
        await navigator.clipboard.writeText(`${tokenName}: ${memeTexts[i]}`);
        setCopiedIdx(i);
        setTimeout(() => setCopiedIdx((c) => (c === i ? null : c)), 1800);
      }
    } catch (e) {
      console.error("copy failed:", e);
      try {
        await navigator.clipboard.writeText(`${tokenName}: ${memeTexts[i]}`);
        setCopiedIdx(i);
        setTimeout(() => setCopiedIdx((c) => (c === i ? null : c)), 1800);
      } catch {}
    } finally {
      setBusyIdx(null);
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
            <div className="grid grid-cols-3 gap-2 mt-2">
              <button
                onClick={() => download(i)}
                disabled={busyIdx === i}
                className="py-2 rounded border border-green-500/50 text-green-400 font-mono text-xs hover-elevate disabled:opacity-50"
                title="Download card as PNG"
                data-testid={`button-meme-download-${i}`}
              >
                ⬇ PNG
              </button>
              <button
                onClick={() => copyToClipboard(i)}
                disabled={busyIdx === i}
                className={`py-2 rounded border font-mono text-xs hover-elevate disabled:opacity-50 transition-colors ${copiedIdx === i ? "border-green-500 bg-green-500/10 text-green-300" : "border-purple-500/50 text-purple-300"}`}
                title="Copy image to clipboard — paste anywhere"
                data-testid={`button-meme-copy-${i}`}
              >
                {copiedIdx === i ? "✓ Copied" : "📋 Copy"}
              </button>
              <button
                onClick={() => shareX(i)}
                className="py-2 rounded bg-white text-black font-mono text-xs hover:bg-zinc-200"
                data-testid={`button-meme-share-${i}`}
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
