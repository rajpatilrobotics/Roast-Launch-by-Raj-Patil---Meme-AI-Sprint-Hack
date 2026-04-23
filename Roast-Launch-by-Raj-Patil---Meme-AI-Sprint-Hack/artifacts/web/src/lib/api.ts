const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "");
export const API = API_BASE
  ? `${API_BASE}/api`
  : (import.meta.env.BASE_URL || "/") + "api";

export type Roast = {
  id: string;
  tokenIdea: string;
  tokenName?: string;
  ticker?: string;
  bull: string;
  skeptic: string;
  rug: string;
  score: number;
  rugProbability: number;
  narrative: number;
  community: number;
  timing: number;
  risk: number;
  verdict: "NGMI" | "DYOR" | "WAGMI";
  summary: string;
  fixedBrief: string[];
  sevenDayPlan: Record<string, string>;
  memeTexts: string[];
  fitsMeta: boolean;
  hotMeta: string;
  txHash?: string;
  timestamp: number;
};

export function verdictColor(v: string) {
  if (v === "WAGMI") return "text-green-400 border-green-500/60 bg-green-500/10";
  if (v === "NGMI") return "text-red-400 border-red-500/60 bg-red-500/10";
  return "text-orange-400 border-orange-500/60 bg-orange-500/10";
}

export function scoreColor(s: number) {
  if (s >= 71) return "text-green-400";
  if (s >= 41) return "text-orange-400";
  return "text-red-400";
}
