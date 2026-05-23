import { wordDiff } from "./diff.js";
import { countTokens } from "./tokenCounter.js";
import type { OptimizedPrompt } from "./types.js";

/**
 * Pure rule-based prompt optimizer. The backend wraps this with an optional
 * LLM call (gpt-4o-mini), but we keep a deterministic local pass so the
 * extension can show a useful diff while offline or while the backend
 * call is in-flight.
 */

interface RulePass {
  name: string;
  apply: (text: string) => string;
}

const PASSES: RulePass[] = [
  {
    name: "strip-leading-pleasantries",
    apply: (t) =>
      t.replace(
        /^\s*(hi|hello|hey|greetings|good (morning|afternoon|evening))[\s,!.]+/i,
        ""
      )
  },
  {
    name: "strip-please-could-you",
    apply: (t) =>
      t.replace(
        /\b(please|kindly|could you (please )?|would you (please )?|can you (please )?)\b/gi,
        ""
      )
  },
  {
    name: "strip-i-was-wondering",
    apply: (t) =>
      t.replace(
        /\b(i was wondering if|i would like to know|i'?d like to know|i want to know|i need to know)\b/gi,
        ""
      )
  },
  {
    name: "strip-thanks",
    apply: (t) =>
      t.replace(
        /\s*(thanks( in advance)?|thank you( in advance)?|cheers|appreciate it)[!.,]?\s*$/gi,
        ""
      )
  },
  {
    name: "collapse-hedges",
    apply: (t) =>
      t
        .replace(/\b(maybe|perhaps|possibly|sort of|kind of|just|basically|actually|really|very|quite)\b/gi, "")
        .replace(/\bi think\b/gi, "")
  },
  {
    name: "tighten-help-me",
    apply: (t) => t.replace(/\bhelp me (to )?(understand|figure out)\b/gi, "explain")
  },
  {
    name: "drop-redundant-articles",
    apply: (t) =>
      t.replace(/\b(in order to)\b/gi, "to").replace(/\bdue to the fact that\b/gi, "because")
  },
  {
    name: "collapse-whitespace",
    apply: (t) => t.replace(/\s+/g, " ").trim()
  },
  {
    name: "trim-trailing-punctuation-stack",
    apply: (t) => t.replace(/[!?.]{2,}$/g, (m) => m[0]!)
  }
];

export function optimizePromptLocal(input: string): OptimizedPrompt {
  const original = input ?? "";
  let optimized = original;
  for (const pass of PASSES) {
    optimized = pass.apply(optimized);
  }

  // Fallback: if we somehow ate everything, restore the original.
  if (!optimized.trim()) optimized = original.trim();

  // Capitalize first character so the prompt still reads cleanly.
  if (optimized.length > 0) {
    optimized = optimized[0]!.toUpperCase() + optimized.slice(1);
  }

  const originalTokens = countTokens(original);
  const optimizedTokens = countTokens(optimized);
  const savedTokens = Math.max(0, originalTokens - optimizedTokens);

  return {
    original,
    optimized,
    originalTokens,
    optimizedTokens,
    savedTokens,
    diff: wordDiff(original, optimized),
    notes: optimized === original ? "No safe local rewrites applied." : undefined
  };
}
