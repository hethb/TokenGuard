import type { DiffOp } from "./types.js";

/**
 * Word-level diff implemented as Hirschberg-light LCS so we ship zero
 * runtime deps. Good enough for prompts up to a few thousand tokens.
 */
export function wordDiff(a: string, b: string): DiffOp[] {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  const m = tokensA.length;
  const n = tokensB.length;

  // Standard LCS DP table. m,n are bounded by prompt size (small), so the
  // O(m*n) memory is fine.
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (tokensA[i] === tokensB[j]) {
        dp[i]![j] = (dp[i + 1]![j + 1] ?? 0) + 1;
      } else {
        dp[i]![j] = Math.max(dp[i + 1]![j] ?? 0, dp[i]![j + 1] ?? 0);
      }
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (tokensA[i] === tokensB[j]) {
      pushOp(ops, { kind: "equal", value: tokensA[i]! });
      i++;
      j++;
    } else if ((dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) {
      pushOp(ops, { kind: "delete", value: tokensA[i]! });
      i++;
    } else {
      pushOp(ops, { kind: "insert", value: tokensB[j]! });
      j++;
    }
  }
  while (i < m) {
    pushOp(ops, { kind: "delete", value: tokensA[i]! });
    i++;
  }
  while (j < n) {
    pushOp(ops, { kind: "insert", value: tokensB[j]! });
    j++;
  }
  return ops;
}

function pushOp(ops: DiffOp[], op: DiffOp): void {
  const last = ops[ops.length - 1];
  if (last && last.kind === op.kind) {
    last.value += op.value;
  } else {
    ops.push({ ...op });
  }
}

function tokenize(text: string): string[] {
  // Keep whitespace attached to the previous token so reconstruction is
  // lossless.
  const out: string[] = [];
  const re = /\S+\s*|\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push(m[0]);
  }
  return out;
}
