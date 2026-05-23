import type { SessionStats } from "@tokenguard/shared";

const STATS_KEY = "tokenguard.session";

function emptyStats(): SessionStats {
  return {
    sessionId: cryptoRandomId(),
    startedAt: Date.now(),
    promptTokensRaw: 0,
    promptTokensOptimized: 0,
    responseTokensRaw: 0,
    responseTokensCleaned: 0,
    optimizations: 0,
    enforcements: 0
  };
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export async function getStats(): Promise<SessionStats> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STATS_KEY], (record) => {
      const existing = record?.[STATS_KEY] as SessionStats | undefined;
      resolve(existing ?? emptyStats());
    });
  });
}

export async function setStats(stats: SessionStats): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STATS_KEY]: stats }, () => resolve());
  });
}

export async function recordPrompt(
  rawTokens: number,
  optimizedTokens: number
): Promise<SessionStats> {
  const stats = await getStats();
  stats.promptTokensRaw += rawTokens;
  stats.promptTokensOptimized += optimizedTokens;
  stats.optimizations += 1;
  await setStats(stats);
  return stats;
}

export async function recordResponse(
  rawTokens: number,
  cleanedTokens: number
): Promise<SessionStats> {
  const stats = await getStats();
  stats.responseTokensRaw += rawTokens;
  stats.responseTokensCleaned += cleanedTokens;
  stats.enforcements += 1;
  await setStats(stats);
  return stats;
}

export async function resetSession(): Promise<SessionStats> {
  const fresh = emptyStats();
  await setStats(fresh);
  return fresh;
}
