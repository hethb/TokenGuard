import {
  countTokens,
  optimizePromptLocal,
  wordDiff,
  type OptimizedPrompt
} from "@tokenguard/shared";
import OpenAI from "openai";
import { config } from "../config.js";

let openai: OpenAI | null | undefined;

function getOpenAi(): OpenAI | null {
  if (openai !== undefined) return openai;
  openai = config.openaiApiKey
    ? new OpenAI({ apiKey: config.openaiApiKey })
    : null;
  return openai;
}

const SYSTEM = `You rewrite user prompts to be maximally concise without
changing intent. Strip filler, pleasantries, and redundant context.
Preserve all named entities, code, numbers, and constraints exactly.
Return ONLY the rewritten prompt — no quoting, no commentary, no labels.`;

export async function optimizePrompt(text: string): Promise<OptimizedPrompt> {
  const local = optimizePromptLocal(text);
  const client = getOpenAi();
  if (!client) return local;

  try {
    const resp = await client.chat.completions.create({
      model: config.openaiModel,
      temperature: 0,
      max_tokens: Math.min(1024, Math.ceil(local.originalTokens * 1.1) + 32),
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: text }
      ]
    });
    const llmText = resp.choices[0]?.message?.content?.trim() ?? "";
    if (!llmText) return local;

    const llmTokens = countTokens(llmText);
    // Only accept the LLM rewrite if it's actually shorter than the local
    // pass — otherwise the model wasted tokens.
    if (llmTokens >= local.optimizedTokens) return local;

    return {
      original: text,
      optimized: llmText,
      originalTokens: local.originalTokens,
      optimizedTokens: llmTokens,
      savedTokens: Math.max(0, local.originalTokens - llmTokens),
      diff: wordDiff(text, llmText),
      notes: `model:${config.openaiModel}`
    };
  } catch (e) {
    console.warn("[TokenGuard] LLM optimize failed, using local:", e);
    return local;
  }
}
