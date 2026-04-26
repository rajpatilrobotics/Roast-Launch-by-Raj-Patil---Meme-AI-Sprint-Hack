import { textGen } from "./textGen";
import type { RoastResult } from "../routes/roast";

export type ComparativeVerdict = {
  scoreA: number;
  scoreB: number;
  winner: "A" | "B";
  reason: string;
};

/**
 * Re-judges two already-roasted coins relative to each other so the two
 * scores are guaranteed to be different and reflect the quality gap.
 * Mutates `a.score` and `b.score` in place and returns the verdict.
 *
 * Why: independent parallel `runRoast` calls often converge on the same
 * "safe middle" score (e.g. both 42/100). This pass forces divergence.
 */
export async function comparativelyJudge(
  a: RoastResult,
  b: RoastResult,
  opts: { labelA?: string; labelB?: string } = {},
): Promise<ComparativeVerdict> {
  const labelA = opts.labelA || "Coin A";
  const labelB = opts.labelB || "Coin B";

  let winner: "A" | "B" = a.score >= b.score ? "A" : "B";
  let reason = `Higher Survive Score (${a.score} vs ${b.score})`;
  let scoreA = a.score;
  let scoreB = b.score;

  try {
    const prompt = `Two meme coin ideas just got roasted in a 1v1 battle. Score them RELATIVE TO EACH OTHER on Four.meme launch potential (0-100). The two scores MUST be different — pick a clear winner. Spread should reflect quality gap (close fight = 5-15 pt gap, blowout = 25+).

${labelA}: "${a.tokenIdea}"
  - Initial score ${a.score}/100, Verdict ${a.verdict}, Rug ${a.rugProbability}%
  - Bull: ${String(a.bull || "").slice(0, 200)}
  - Skeptic: ${String(a.skeptic || "").slice(0, 200)}

${labelB}: "${b.tokenIdea}"
  - Initial score ${b.score}/100, Verdict ${b.verdict}, Rug ${b.rugProbability}%
  - Bull: ${String(b.bull || "").slice(0, 200)}
  - Skeptic: ${String(b.skeptic || "").slice(0, 200)}

Reply ONLY as JSON: {"scoreA":number,"scoreB":number,"winner":"A"|"B","reason":"one savage sentence, max 25 words"}`;
    const raw = await textGen(prompt, { json: true });
    const txt = raw.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    const m = txt.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : txt);
    const sa = Number(parsed.scoreA);
    const sb = Number(parsed.scoreB);
    if (Number.isFinite(sa) && sa >= 0 && sa <= 100) scoreA = Math.round(sa);
    if (Number.isFinite(sb) && sb >= 0 && sb <= 100) scoreB = Math.round(sb);
    if (parsed.winner === "A" || parsed.winner === "B") winner = parsed.winner;
    if (typeof parsed.reason === "string" && parsed.reason.trim()) reason = parsed.reason.trim();
  } catch {
    // fall through to safety net below
  }

  // Safety net: scores must never be equal, and winner must always have the higher score.
  if (scoreA === scoreB) {
    if (winner === "A") scoreA = Math.min(100, scoreA + 3);
    else scoreB = Math.min(100, scoreB + 3);
  } else {
    winner = scoreA > scoreB ? "A" : "B";
  }

  a.score = scoreA;
  b.score = scoreB;

  return { scoreA, scoreB, winner, reason };
}
