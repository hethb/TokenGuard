export interface FluffCategory {
  description: string;
  weight: number;
  patterns: string[];
}

export interface FluffPatternConfig {
  version: string;
  categories: Record<string, FluffCategory>;
  defaultThreshold: number;
}

export interface FluffFlag {
  category: string;
  sentence: string;
  index: number;
  start: number;
  end: number;
  weight: number;
}

export interface FluffScoreResult {
  score: number;
  flags: FluffFlag[];
  totalSentences: number;
  cleanedText: string;
}

export interface OptimizedPrompt {
  original: string;
  optimized: string;
  originalTokens: number;
  optimizedTokens: number;
  savedTokens: number;
  diff: DiffOp[];
  notes?: string;
}

export type DiffOpKind = "equal" | "insert" | "delete";

export interface DiffOp {
  kind: DiffOpKind;
  value: string;
}

export interface SessionStats {
  sessionId: string;
  startedAt: number;
  promptTokensRaw: number;
  promptTokensOptimized: number;
  responseTokensRaw: number;
  responseTokensCleaned: number;
  optimizations: number;
  enforcements: number;
}

export interface TokenGuardSettings {
  enabled: boolean;
  enforceSystemPrompt: boolean;
  systemPromptTemplate: string;
  optimizePrompt: boolean;
  fluffThreshold: number;
  showDiffOverlay: boolean;
  apiBaseUrl: string;
  apiKey?: string;
  pricing: PricingTable;
}

export interface PricingTable {
  // USD per 1k tokens.
  inputPerK: number;
  outputPerK: number;
  modelLabel: string;
}

export const DEFAULT_PRICING: PricingTable = {
  inputPerK: 0.00015,
  outputPerK: 0.0006,
  modelLabel: "gpt-4o-mini"
};
