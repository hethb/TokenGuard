import type {
  FluffScoreResult,
  OptimizedPrompt,
  SessionStats,
  TokenGuardSettings
} from "@tokenguard/shared";

export type TokenGuardMessage =
  | { type: "OPTIMIZE_PROMPT"; payload: { text: string } }
  | { type: "ENFORCE_RESPONSE"; payload: { text: string } }
  | { type: "GET_SETTINGS" }
  | { type: "UPDATE_SETTINGS"; payload: Partial<TokenGuardSettings> }
  | { type: "GET_SESSION_STATS" }
  | {
      type: "RECORD_PROMPT";
      payload: { rawTokens: number; optimizedTokens: number };
    }
  | {
      type: "RECORD_RESPONSE";
      payload: { rawTokens: number; cleanedTokens: number };
    }
  | { type: "RESET_SESSION" }
  | { type: "TOKEN_COUNT"; payload: { text: string } }
  | { type: "OPEN_OPTIONS" };

export type TokenGuardResponse<T extends TokenGuardMessage["type"]> =
  T extends "OPTIMIZE_PROMPT"
    ? OptimizedPrompt
    : T extends "ENFORCE_RESPONSE"
      ? FluffScoreResult
      : T extends "GET_SETTINGS"
        ? TokenGuardSettings
        : T extends "UPDATE_SETTINGS"
          ? TokenGuardSettings
          : T extends "GET_SESSION_STATS"
            ? SessionStats
            : T extends "TOKEN_COUNT"
              ? { tokens: number }
              : { ok: true };

export function sendMessage<M extends TokenGuardMessage>(
  msg: M
): Promise<TokenGuardResponse<M["type"]>> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(msg, (response) => {
        const err = chrome.runtime.lastError;
        if (err) reject(new Error(err.message));
        else resolve(response as TokenGuardResponse<M["type"]>);
      });
    } catch (e) {
      reject(e as Error);
    }
  });
}
