import type { FakeTx } from "../components/TxReceipt";

const HEX = "0123456789abcdef";

function randHex(len: number): string {
  let s = "";
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint8Array(Math.ceil(len / 2));
    crypto.getRandomValues(buf);
    for (const b of buf) s += b.toString(16).padStart(2, "0");
    return s.slice(0, len);
  }
  for (let i = 0; i < len; i++) s += HEX[Math.floor(Math.random() * 16)];
  return s;
}

export function generateFakeTx(): FakeTx {
  const hash = "0x" + randHex(64);
  // Realistic gas fee around 0.00015 - 0.00040 BNB
  const gas = 0.00015 + Math.random() * 0.00025;
  const gasFee = gas.toFixed(5);
  // Realistic BSC testnet block number (~46M as of 2026)
  const blockNumber = 46_000_000 + Math.floor(Math.random() * 2_000_000);
  return {
    hash,
    gasFee,
    blockNumber,
    timestamp: Date.now(),
  };
}

export function simulateTxSubmit(): Promise<FakeTx> {
  const delay = 2000 + Math.floor(Math.random() * 2000); // 2–4s
  return new Promise((resolve) => {
    setTimeout(() => resolve(generateFakeTx()), delay);
  });
}
