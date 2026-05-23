import { describe, it, expect } from "vitest";
import { optimizePromptLocal } from "@tokenguard/shared";

describe("optimizePromptLocal", () => {
  it("strips leading pleasantries and trailing thanks", () => {
    const input =
      "Hi there! Could you please tell me what the capital of France is? Thanks in advance!";
    const result = optimizePromptLocal(input);
    expect(result.optimized.toLowerCase()).not.toContain("could you please");
    expect(result.optimized.toLowerCase()).not.toContain("thanks");
    expect(result.optimized.toLowerCase()).not.toContain("hi there");
    expect(result.savedTokens).toBeGreaterThan(0);
  });

  it("preserves the actual question", () => {
    const input = "Please could you explain what TCP is?";
    const result = optimizePromptLocal(input);
    expect(result.optimized.toLowerCase()).toContain("tcp");
    expect(result.optimized.toLowerCase()).toContain("explain");
  });

  it("returns the original when nothing applies", () => {
    const input = "Define entropy.";
    const result = optimizePromptLocal(input);
    expect(result.optimized).toBe(input);
    expect(result.savedTokens).toBe(0);
  });

  it("produces a non-empty diff list", () => {
    const result = optimizePromptLocal("Hi please tell me something");
    expect(result.diff.length).toBeGreaterThan(0);
  });

  it("never returns an empty string", () => {
    const result = optimizePromptLocal("hi");
    expect(result.optimized.length).toBeGreaterThan(0);
  });
});
