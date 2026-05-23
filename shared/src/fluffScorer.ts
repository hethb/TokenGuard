import { compileFluffPatterns, fluffPatterns } from "./fluffPatterns.js";
import type {
  FluffFlag,
  FluffPatternConfig,
  FluffScoreResult
} from "./types.js";
import { splitSentences } from "./sentences.js";

export interface FluffScorerOptions {
  config?: FluffPatternConfig;
  /** Minimum sentences before we report a score (avoids noisy 100% on
   * single-sentence canned greetings being flagged). */
  minSentences?: number;
}

/**
 * Score and clean an LLM response. Runs entirely on regexes so it is safe
 * to call in a browser content script with no extra dependencies.
 */
export function scoreFluff(
  text: string,
  opts: FluffScorerOptions = {}
): FluffScoreResult {
  const config = opts.config ?? fluffPatterns;
  const compiled = compileFluffPatterns(config);
  const sentences = splitSentences(text);

  if (sentences.length === 0) {
    return { score: 0, flags: [], totalSentences: 0, cleanedText: text };
  }

  const flags: FluffFlag[] = [];
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i]!;
    for (const cat of compiled) {
      const hit = cat.regexes.find((r) => r.test(s.text));
      if (hit) {
        flags.push({
          category: cat.name,
          sentence: s.text,
          index: i,
          start: s.start,
          end: s.end,
          weight: cat.weight
        });
        break; // one flag per sentence; first category wins
      }
    }
  }

  const minSentences = opts.minSentences ?? 1;
  const denominator = Math.max(sentences.length, minSentences);
  const weightedHits = flags.reduce((acc, f) => acc + f.weight, 0);
  const rawScore = (weightedHits / denominator) * 100;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Build cleaned text by skipping flagged sentence spans.
  const flaggedIndices = new Set(flags.map((f) => f.index));
  const cleanedSentences = sentences
    .filter((_, i) => !flaggedIndices.has(i))
    .map((s) => s.text);
  const cleanedText = cleanedSentences.join(" ").replace(/\s+/g, " ").trim();

  return {
    score,
    flags,
    totalSentences: sentences.length,
    cleanedText
  };
}

/**
 * Strict fluff stripper used by the extension content script as the very
 * first defensive pass. Removes only patterns we are highly confident about.
 */
export function stripObviousFluff(text: string): string {
  if (!text) return text;
  const sentences = splitSentences(text);
  const compiled = compileFluffPatterns();
  // Categories we trust for "always strip" mode.
  const safeCategories = new Set([
    "recapOpeners",
    "softEndings",
    "paddingTransitions"
  ]);
  const kept = sentences.filter((s) => {
    for (const cat of compiled) {
      if (!safeCategories.has(cat.name)) continue;
      if (cat.regexes.some((r) => r.test(s.text))) return false;
    }
    return true;
  });
  return kept.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
}
