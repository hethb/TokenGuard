import {
  heuristicTokenCounter,
  setTokenCounter,
  type TokenCounter
} from "@tokenguard/shared";

/**
 * Install a tiktoken-backed counter. Designed for popup / options pages where
 * WASM loads cleanly. Service workers and content scripts can still call this
 * but will silently fall back to the heuristic counter if WASM init fails.
 *
 * Background: tiktoken ships a `cl100k_base` encoder which matches the GPT-4o
 * family. Anthropic doesn't publish their tokenizer, so we use cl100k as a
 * conservative estimate for Claude as well — it's typically within ~10%.
 */
export async function installTiktokenCounter(): Promise<TokenCounter> {
  try {
    const [{ Tiktoken }, encoderJson] = await Promise.all([
      import("tiktoken/lite"),
      import("tiktoken/encoders/cl100k_base.json")
    ]);

    const data = (encoderJson as unknown as {
      default?: EncoderJson;
      bpe_ranks?: string;
      special_tokens?: Record<string, number>;
      pat_str?: string;
    });
    const ranks = data.default ?? (data as EncoderJson);

    const enc = new Tiktoken(
      ranks.bpe_ranks,
      ranks.special_tokens,
      ranks.pat_str
    );

    const counter: TokenCounter = {
      count(text: string): number {
        if (!text) return 0;
        try {
          return enc.encode(text).length;
        } catch {
          return heuristicTokenCounter.count(text);
        }
      }
    };
    setTokenCounter(counter);
    return counter;
  } catch (e) {
    console.warn("[TokenGuard] tiktoken unavailable, using heuristic:", e);
    setTokenCounter(heuristicTokenCounter);
    return heuristicTokenCounter;
  }
}

interface EncoderJson {
  bpe_ranks: string;
  special_tokens: Record<string, number>;
  pat_str: string;
}
