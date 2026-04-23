import { useEffect, useMemo, useRef, useState } from "react";
import { API, type Roast } from "../lib/api";
import { useUser } from "../context/UserContext";

type Check = {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail";
  hint?: string;
};

function buildChecks(roast: Roast): Check[] {
  const name = (roast.tokenName || "").trim();
  const ticker = (roast.ticker || "").trim().toUpperCase();
  const tickerOk = /^[A-Z0-9]{3,5}$/.test(ticker);
  const memeReady = Array.isArray(roast.memeTexts) && roast.memeTexts.length >= 2;
  return [
    {
      key: "score",
      label: "Survive Score ≥ 70",
      status: roast.score >= 70 ? "pass" : "fail",
      hint: roast.score >= 70 ? `${roast.score}/100` : `Only ${roast.score}/100 — sharpen the pitch and reroast.`,
    },
    {
      key: "name",
      label: "Catchy name set",
      status: name.length >= 3 ? "pass" : "fail",
      hint: name.length >= 3 ? name : "Add a token name above and reroast.",
    },
    {
      key: "ticker",
      label: "3–5 char ticker",
      status: tickerOk ? "pass" : "fail",
      hint: tickerOk ? `$${ticker}` : ticker ? `"${ticker}" must be 3–5 letters/digits.` : "Add a ticker above and reroast.",
    },
    {
      key: "meme",
      label: "Meme art ready",
      status: memeReady ? "pass" : "fail",
      hint: memeReady ? `${roast.memeTexts.length} captions ready` : "Reroast — AI didn't return enough captions.",
    },
    {
      key: "meta",
      label: "Fits current meta",
      status: roast.fitsMeta ? "pass" : "warn",
      hint: roast.fitsMeta ? `On-meta (${roast.hotMeta})` : `Off-meta vs "${roast.hotMeta}" — harder to trend.`,
    },
  ];
}

function buildFourMemeUrl(roast: Roast): string {
  const params = new URLSearchParams();
  if (roast.tokenName) params.set("name", roast.tokenName);
  if (roast.ticker) params.set("symbol", roast.ticker.toUpperCase());
  const desc = roast.summary || roast.tokenIdea;
  if (desc) params.set("description", desc.slice(0, 200));
  return `https://four.meme/en/create-token?${params.toString()}`;
}

export default function LaunchPanel({
  roast,
  onLaunchedConfetti,
}: {
  roast: Roast;
  onLaunchedConfetti?: () => void;
}) {
  const { userName } = useUser();
  const checks = useMemo(() => buildChecks(roast), [roast]);
  const passed = checks.filter((c) => c.status === "pass").length;
  const failed = checks.filter((c) => c.status === "fail");
  const allReady = failed.length === 0;
  const total = checks.length;

  const [copied, setCopied] = useState(false);
  const [launched, setLaunched] = useState<boolean>(!!roast.launched);
  const firedRef = useRef(false);

  useEffect(() => {
    if (allReady && !firedRef.current) {
      firedRef.current = true;
      onLaunchedConfetti?.();
    }
  }, [allReady, onLaunchedConfetti]);

  useEffect(() => {
    setLaunched(!!roast.launched);
    firedRef.current = false;
  }, [roast.id]);

  async function copyPayload() {
    const payload = [
      `Name: ${roast.tokenName || "(add a name)"}`,
      `Ticker: $${(roast.ticker || "").toUpperCase() || "(add a ticker)"}`,
      `Description: ${roast.summary || roast.tokenIdea}`,
      ``,
      `Meme captions:`,
      ...roast.memeTexts.map((m, i) => `${i + 1}. ${m}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  async function trackLaunch() {
    setLaunched(true);
    try {
      await fetch(`${API}/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: roast.id,
          userName: userName || undefined,
          tokenName: roast.tokenName,
          ticker: (roast.ticker || "").toUpperCase(),
          tokenIdea: roast.tokenIdea,
          score: roast.score,
          verdict: roast.verdict,
        }),
      });
    } catch {
      // ignore
    }
  }

  const launchUrl = buildFourMemeUrl(roast);

  return (
    <div
      className={`rounded-2xl border-2 p-5 ${
        allReady
          ? "border-green-500/60 bg-gradient-to-br from-green-500/10 to-yellow-500/5"
          : "border-zinc-800 bg-black/40"
      }`}
      data-testid="launch-panel"
    >
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {allReady ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-green-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              Launch ready
            </span>
          ) : (
            <span className="text-xs font-mono uppercase tracking-wider text-orange-300">
              🚧 Pre-flight checklist
            </span>
          )}
        </div>
        <span className="text-[11px] font-mono text-zinc-500">
          {passed}/{total} checks passed
        </span>
      </div>

      <ul className="space-y-1.5 mb-4">
        {checks.map((c) => {
          const icon = c.status === "pass" ? "✅" : c.status === "warn" ? "⚠️" : "❌";
          const color =
            c.status === "pass" ? "text-green-300" : c.status === "warn" ? "text-yellow-300" : "text-red-300";
          return (
            <li key={c.key} className="flex items-start gap-2 text-sm">
              <span className="leading-5">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`${color} font-mono text-xs uppercase tracking-wide`}>{c.label}</div>
                {c.hint && <div className="text-[11px] text-zinc-400 truncate">{c.hint}</div>}
              </div>
            </li>
          );
        })}
      </ul>

      {allReady ? (
        <>
          <a
            href={launchUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackLaunch}
            className="block w-full text-center py-4 rounded-xl bg-gradient-to-r from-yellow-400 via-orange-500 to-green-500 text-black font-black text-lg hover:scale-[1.01] transition launch-pulse"
            data-testid="launch-on-fourmeme"
          >
            🚀 Launch ${(roast.ticker || "COIN").toUpperCase()} on Four.meme →
          </a>
          <button
            onClick={copyPayload}
            className="mt-2 w-full py-2 rounded-lg border border-zinc-700 text-zinc-300 font-mono text-xs hover-elevate"
            data-testid="copy-launch-payload"
          >
            {copied ? "✓ Copied!" : "📋 Copy launch payload"}
          </button>
          {launched && (
            <div className="mt-3 text-center text-[11px] font-mono text-green-300">
              🚀 Logged to your profile · Launched ${(roast.ticker || "COIN").toUpperCase()} on Four.meme
            </div>
          )}
        </>
      ) : (
        <>
          <a
            href={launchUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackLaunch}
            className="block w-full text-center py-4 rounded-xl border-2 border-orange-500/60 bg-orange-500/10 text-orange-300 font-black text-base hover:bg-orange-500/20 transition"
            data-testid="launch-not-ready"
          >
            🚧 Launch anyway on Four.meme →
          </a>
          <div className="mt-2 text-center text-[11px] font-mono text-zinc-500">
            Heads up — your coin failed {failed.length} pre-flight {failed.length === 1 ? "check" : "checks"}. Recommended fixes:
          </div>
          <ul className="mt-2 space-y-1 text-[11px] font-mono text-zinc-400">
            {failed.map((f) => (
              <li key={f.key}>
                <span className="text-red-400">×</span> {f.label}
                {f.hint ? <span className="text-zinc-500"> — {f.hint}</span> : null}
              </li>
            ))}
          </ul>
          <button
            onClick={copyPayload}
            className="mt-3 w-full py-2 rounded-lg border border-zinc-700 text-zinc-300 font-mono text-xs hover-elevate"
            data-testid="copy-launch-payload"
          >
            {copied ? "✓ Copied!" : "📋 Copy launch payload"}
          </button>
          {launched && (
            <div className="mt-3 text-center text-[11px] font-mono text-green-300">
              🚀 Logged to your profile · Launched ${(roast.ticker || "COIN").toUpperCase()} on Four.meme
            </div>
          )}
        </>
      )}
    </div>
  );
}
