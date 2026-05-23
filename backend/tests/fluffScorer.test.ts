import { describe, it, expect } from "vitest";
import {
  scoreFluff,
  splitSentences,
  stripObviousFluff
} from "@tokenguard/shared";

describe("splitSentences", () => {
  it("splits on . ! ? while respecting common abbreviations", () => {
    const text = "Dr. Foo went to St. Mary's. Then he ran! Did he? Yes.";
    const spans = splitSentences(text);
    expect(spans.map((s) => s.text)).toEqual([
      "Dr. Foo went to St. Mary's.",
      "Then he ran!",
      "Did he?",
      "Yes."
    ]);
  });

  it("treats blank lines as boundaries", () => {
    const text = "First line\n\nSecond line";
    const spans = splitSentences(text);
    expect(spans).toHaveLength(2);
    expect(spans[0]!.text).toBe("First line");
    expect(spans[1]!.text).toBe("Second line");
  });

  it("returns empty for empty input", () => {
    expect(splitSentences("")).toEqual([]);
    expect(splitSentences("   ")).toEqual([]);
  });
});

describe("scoreFluff", () => {
  it("scores 0 for clean direct answers", () => {
    const text = "The capital of France is Paris.";
    const r = scoreFluff(text);
    expect(r.score).toBe(0);
    expect(r.flags).toHaveLength(0);
    expect(r.totalSentences).toBe(1);
  });

  it("flags recap openers", () => {
    const text = "Great question! The answer is 42.";
    const r = scoreFluff(text);
    expect(r.flags.some((f) => f.category === "recapOpeners")).toBe(true);
    expect(r.score).toBeGreaterThan(0);
  });

  it("flags soft endings", () => {
    const text = "The answer is 42. Let me know if you have any other questions!";
    const r = scoreFluff(text);
    expect(r.flags.some((f) => f.category === "softEndings")).toBe(true);
  });

  it("flags hedge clusters", () => {
    const text =
      "It's worth noting that water boils at 100C. Keep in mind that altitude affects this.";
    const r = scoreFluff(text);
    expect(r.flags.length).toBeGreaterThanOrEqual(2);
  });

  it("flags padding transitions", () => {
    const text =
      "We discussed many things. In conclusion, you should drink water. As mentioned above, hydration matters.";
    const r = scoreFluff(text);
    expect(r.flags.some((f) => f.category === "paddingTransitions")).toBe(true);
  });

  it("flags unsolicited alternatives", () => {
    const text =
      "Use map to transform arrays. Alternatively, you could use forEach with push.";
    const r = scoreFluff(text);
    expect(r.flags.some((f) => f.category === "unsolicitedAlternatives")).toBe(
      true
    );
  });

  it("scales with weighted hits and clamps to 0..100", () => {
    const allFluff =
      "Great question! Hope this helps. In conclusion, that's it. Let me know if you have questions!";
    const r = scoreFluff(allFluff);
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("computes cleanedText by removing flagged sentences", () => {
    const text = "Great question! Paris is the capital. Hope this helps.";
    const r = scoreFluff(text);
    expect(r.cleanedText).toContain("Paris");
    expect(r.cleanedText).not.toMatch(/great question/i);
    expect(r.cleanedText).not.toMatch(/hope this helps/i);
  });
});

describe("stripObviousFluff", () => {
  it("removes only safe-category sentences", () => {
    const text =
      "Sure! Here is the answer. It's worth noting this matters. Hope this helps.";
    const cleaned = stripObviousFluff(text);
    // hedgeClusters is not in the "safe" list, so it stays
    expect(cleaned).toContain("worth noting");
    expect(cleaned).toContain("Here is the answer");
    expect(cleaned).not.toMatch(/^sure/i);
    expect(cleaned).not.toMatch(/hope this helps/i);
  });
});
