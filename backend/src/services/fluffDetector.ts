import {
  scoreFluff,
  stripObviousFluff,
  type FluffScoreResult
} from "@tokenguard/shared";

/**
 * Server-side enforcement: run the regex scorer first (fast, deterministic),
 * then optionally augment with a stricter cleaner. We keep this layer pluggable
 * so a future ML classifier can drop in without touching the route handler.
 */
export async function enforceResponse(text: string): Promise<FluffScoreResult> {
  const result = scoreFluff(text);
  // For very high fluff scores we apply the aggressive stripper; otherwise
  // we trust the per-sentence cleaner from `scoreFluff`.
  const cleaned =
    result.score >= 50 ? stripObviousFluff(result.cleanedText) : result.cleanedText;
  return { ...result, cleanedText: cleaned };
}
