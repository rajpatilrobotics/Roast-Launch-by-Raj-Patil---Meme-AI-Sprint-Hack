import { useEffect, useState } from "react";
import { CHAIN } from "../lib/chain";

export type FakeTx = {
  hash: string;
  gasFee: string;
  blockNumber: number;
  timestamp: number;
};

export default function TxReceipt({ tx }: { tx: FakeTx }) {
  const [copied, setCopied] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 30);
    return () => clearTimeout(t);
  }, []);

  function copyHash() {
    navigator.clipboard.writeText(tx.hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const shortHash = `${tx.hash.slice(0, 10)}…${tx.hash.slice(-8)}`;
  const explorerUrl = CHAIN.explorerTx(tx.hash);
  const ts = new Date(tx.timestamp);

  return (
    <div
      className={`rounded-xl border border-green-500/40 bg-gradient-to-br from-green-500/10 to-black p-4 transition-all duration-500 ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
      data-testid="tx-receipt"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="relative w-9 h-9 flex items-center justify-center rounded-full bg-green-500/20 border border-green-500/60">
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 text-green-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M5 12.5L10 17.5L19 7.5"
              style={{
                strokeDasharray: 24,
                strokeDashoffset: show ? 0 : 24,
                transition: "stroke-dashoffset 600ms ease-out 100ms",
              }}
            />
          </svg>
          <span
            className={`absolute inset-0 rounded-full border-2 border-green-400/50 ${
              show ? "animate-ping" : ""
            }`}
            style={{ animationIterationCount: 1, animationDuration: "900ms" }}
          />
        </div>
        <div>
          <div className="text-sm font-bold text-green-400">Transaction successful</div>
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
            Confirmed on {CHAIN.label}
          </div>
        </div>
      </div>

      <div className="space-y-2 text-xs font-mono">
        <Row label="Tx Hash">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noreferrer"
            className="text-green-400 hover:underline break-all"
            data-testid="link-tx-hash"
          >
            {shortHash}
          </a>
          <button
            onClick={copyHash}
            className="ml-2 text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400 hover-elevate"
            data-testid="button-copy-hash"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </Row>
        <Row label="Gas Fee">
          <span className="text-zinc-200">{tx.gasFee} BNB</span>
        </Row>
        <Row label="Block">
          <span className="text-zinc-200">#{tx.blockNumber.toLocaleString()}</span>
        </Row>
        <Row label="Time">
          <span className="text-zinc-200">{ts.toLocaleString()}</span>
        </Row>
      </div>

      <a
        href={explorerUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 block text-center py-2.5 rounded-lg bg-green-500/15 border border-green-500/50 text-green-300 text-xs font-mono uppercase tracking-wider hover-elevate"
        data-testid="link-view-explorer"
      >
        View on Explorer ↗
      </a>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-500 uppercase text-[10px] tracking-wider">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
