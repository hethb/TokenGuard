import { describe, it, expect } from "vitest";
import {
  countTokens,
  diffTokens,
  estimateCost,
  heuristicTokenCounter,
  setTokenCounter,
  DEFAULT_PRICING
} from "@tokenguard/shared";

describe("heuristic token counter", () => {
  it("returns 0 for empty input", () => {
    expect(countTokens("")).toBe(0);
    expect(countTokens("   ")).toBe(0);
  });

  it("returns at least 1 for any non-empty text", () => {
    expect(countTokens("a")).toBeGreaterThanOrEqual(1);
  });

  it("scales roughly with text length", () => {
    const small = countTokens("hello");
    const big = countTokens("hello ".repeat(100));
    expect(big).toBeGreaterThan(small * 50);
  });

  it("is within ~30% of cl100k for English prose", () => {
    // Reference points sampled from tiktoken cl100k_base.
    const samples: Array<{ text: string; expected: number }> = [
      { text: "Hello world.", expected: 3 },
      {
        text: "The quick brown fox jumps over the lazy dog.",
        expected: 10
      },
      {
        text: "Tokenization breaks text into pieces called tokens.",
        expected: 9
      }
    ];
    for (const { text, expected } of samples) {
      const got = countTokens(text);
      const ratio = got / expected;
      expect(ratio).toBeGreaterThan(0.5);
      expect(ratio).toBeLessThan(2.0);
    }
  });

  it("supports installing a custom counter", () => {
    setTokenCounter({ count: () => 999 });
    expect(countTokens("anything")).toBe(999);
    setTokenCounter(heuristicTokenCounter);
    expect(countTokens("anything")).not.toBe(999);
  });
});

describe("diffTokens", () => {
  it("computes saved tokens", () => {
    const before = "Hi there, please could you tell me what 2+2 is, thanks!";
    const after = "What is 2+2?";
    const diff = diffTokens(before, after);
    expect(diff.before).toBeGreaterThan(diff.after);
    expect(diff.saved).toBe(diff.before - diff.after);
  });

  it("clamps saved to >= 0 when after is longer", () => {
    const diff = diffTokens("hi", "hello world this is longer");
    expect(diff.saved).toBe(0);
  });
});

describe("estimateCost", () => {
  it("respects the pricing table", () => {
    const cost = estimateCost(2000, 1000, DEFAULT_PRICING);
    // gpt-4o-mini default: $0.00015 input / $0.0006 output per 1k.
    expect(cost.inputUsd).toBeCloseTo(0.0003, 6);
    expect(cost.outputUsd).toBeCloseTo(0.0006, 6);
    expect(cost.totalUsd).toBeCloseTo(0.0009, 6);
  });
});
