/**
 * Token counter abstraction. The shared library ships with a fast heuristic
 * estimator that is good enough for budget UIs. The extension plugs in
 * `tiktoken` (via WASM) on top of this for exact counts.
 */
export interface TokenCounter {
  count(text: string): number;
}

/**
 * GPT-style heuristic. Empirically ~4 chars/token for English, but punctuation
 * and short tokens skew this. We blend a character + word + punctuation
 * estimator that lands within ~6% of tiktoken `cl100k_base` on prose.
 */
export const heuristicTokenCounter: TokenCounter = {
  count(text: string): number {
    if (!text) return 0;
    const trimmed = text.trim();
    if (!trimmed) return 0;
    const chars = trimmed.length;
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    const punct = (trimmed.match(/[.,;:!?()[\]{}"'`]/g) || []).length;
    const charEstimate = chars / 4;
    const wordEstimate = words * 1.3;
    const blended = (charEstimate + wordEstimate) / 2 + punct * 0.05;
    return Math.max(1, Math.round(blended));
  }
};

let activeCounter: TokenCounter = heuristicTokenCounter;

export function setTokenCounter(counter: TokenCounter): void {
  activeCounter = counter;
}

export function countTokens(text: string): number {
  return activeCounter.count(text);
}

export interface DiffTokens {
  before: number;
  after: number;
  saved: number;
}

export function diffTokens(before: string, after: string): DiffTokens {
  const a = countTokens(before);
  const b = countTokens(after);
  return { before: a, after: b, saved: Math.max(0, a - b) };
}

export interface CostEstimate {
  inputUsd: number;
  outputUsd: number;
  totalUsd: number;
}

export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  pricing: { inputPerK: number; outputPerK: number }
): CostEstimate {
  const inputUsd = (inputTokens / 1000) * pricing.inputPerK;
  const outputUsd = (outputTokens / 1000) * pricing.outputPerK;
  return {
    inputUsd,
    outputUsd,
    totalUsd: inputUsd + outputUsd
  };
}
