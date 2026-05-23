import { describe, it, expect } from "vitest";
import { wordDiff } from "@tokenguard/shared";

describe("wordDiff", () => {
  it("returns a single equal op when texts match", () => {
    const diff = wordDiff("hello world", "hello world");
    expect(diff).toHaveLength(1);
    expect(diff[0]?.kind).toBe("equal");
  });

  it("emits insert/delete ops for differing tokens", () => {
    const diff = wordDiff("please tell me about dogs", "tell me about cats");
    const inserts = diff.filter((d) => d.kind === "insert");
    const deletes = diff.filter((d) => d.kind === "delete");
    expect(deletes.length).toBeGreaterThan(0);
    expect(inserts.length).toBeGreaterThan(0);
  });

  it("reconstructs original via equal+delete and rewrite via equal+insert", () => {
    const a = "hi please could you tell me what is rain";
    const b = "what is rain";
    const diff = wordDiff(a, b);
    const before = diff
      .filter((d) => d.kind !== "insert")
      .map((d) => d.value)
      .join("");
    const after = diff
      .filter((d) => d.kind !== "delete")
      .map((d) => d.value)
      .join("");
    expect(before.trim()).toBe(a.trim());
    expect(after.trim()).toBe(b.trim());
  });
});
