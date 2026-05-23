import type { SessionStats } from "@tokenguard/shared";
import { getKvStore } from "../db/redis.js";
import { getHistoryStore } from "../db/postgres.js";

const SESSION_TTL = 60 * 60 * 24; // 24 hours

function key(userId: string): string {
  return `tg:session:${userId}`;
}

function blank(userId: string): SessionStats {
  return {
    sessionId: userId,
    startedAt: Date.now(),
    promptTokensRaw: 0,
    promptTokensOptimized: 0,
    responseTokensRaw: 0,
    responseTokensCleaned: 0,
    optimizations: 0,
    enforcements: 0
  };
}

export async function getSession(userId: string): Promise<SessionStats> {
  const kv = getKvStore();
  const stored = await kv.get<SessionStats>(key(userId));
  return stored ?? blank(userId);
}

export async function recordOptimization(
  userId: string,
  rawTokens: number,
  optimizedTokens: number
): Promise<SessionStats> {
  const stats = await getSession(userId);
  stats.promptTokensRaw += rawTokens;
  stats.promptTokensOptimized += optimizedTokens;
  stats.optimizations += 1;
  await getKvStore().set(key(userId), stats, SESSION_TTL);
  const history = await getHistoryStore();
  await history.appendOptimization({
    user_id: userId,
    prompt_tokens_raw: rawTokens,
    prompt_tokens_optimized: optimizedTokens,
    response_tokens_raw: 0,
    response_tokens_cleaned: 0,
    fluff_score: null
  });
  return stats;
}

export async function recordEnforcement(
  userId: string,
  rawTokens: number,
  cleanedTokens: number,
  fluffScore: number
): Promise<SessionStats> {
  const stats = await getSession(userId);
  stats.responseTokensRaw += rawTokens;
  stats.responseTokensCleaned += cleanedTokens;
  stats.enforcements += 1;
  await getKvStore().set(key(userId), stats, SESSION_TTL);
  const history = await getHistoryStore();
  await history.appendEnforcement({
    user_id: userId,
    prompt_tokens_raw: 0,
    prompt_tokens_optimized: 0,
    response_tokens_raw: rawTokens,
    response_tokens_cleaned: cleanedTokens,
    fluff_score: Math.round(fluffScore)
  });
  return stats;
}

export async function resetSession(userId: string): Promise<SessionStats> {
  const fresh = blank(userId);
  await getKvStore().set(key(userId), fresh, SESSION_TTL);
  return fresh;
}
