import { groqText, hasGroq } from "./groq";
import { generateWithRotation, hasGemini } from "./gemini";

export async function textGen(
  prompt: string,
  opts: { json?: boolean; system?: string } = {},
): Promise<string> {
  if (hasGroq()) {
    try {
      return await groqText(prompt, opts);
    } catch (e: any) {
      console.warn("[textGen] groq failed, falling back to gemini:", String(e?.message || e).slice(0, 200));
      if (!hasGemini()) throw e;
    }
  }
  if (!hasGemini()) throw new Error("No text-gen provider configured (need GROQ_API_KEY or GEMINI_API_KEY)");
  const modelOpts = opts.json
    ? { model: "gemini-flash-latest", generationConfig: { responseMimeType: "application/json" as const } }
    : { model: "gemini-flash-latest" };
  const fullPrompt = opts.system ? `${opts.system}\n\n${prompt}` : prompt;
  return generateWithRotation(modelOpts, fullPrompt);
}
