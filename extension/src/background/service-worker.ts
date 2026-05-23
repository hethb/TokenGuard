import {
  countTokens,
  optimizePromptLocal,
  scoreFluff,
  type FluffScoreResult,
  type OptimizedPrompt
} from "@tokenguard/shared";
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS
} from "../shared/settings.js";
import {
  getStats,
  recordPrompt,
  recordResponse,
  resetSession
} from "../shared/sessionStore.js";
import type { TokenGuardMessage } from "../shared/messages.js";

// Initialize settings on first install so the options page has values.
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await saveSettings(DEFAULT_SETTINGS);
  }
});

chrome.runtime.onMessage.addListener(
  (msg: TokenGuardMessage, _sender, sendResponse) => {
    handle(msg)
      .then((result) => sendResponse(result))
      .catch((err) => {
        console.error("[TokenGuard] message handler failed:", err);
        sendResponse({ error: (err as Error)?.message ?? "unknown" });
      });
    // Returning true keeps the message channel open for async sendResponse.
    return true;
  }
);

async function handle(msg: TokenGuardMessage): Promise<unknown> {
  switch (msg.type) {
    case "OPTIMIZE_PROMPT":
      return optimizePrompt(msg.payload.text);
    case "ENFORCE_RESPONSE":
      return enforceResponse(msg.payload.text);
    case "GET_SETTINGS":
      return loadSettings();
    case "UPDATE_SETTINGS":
      return saveSettings(msg.payload);
    case "GET_SESSION_STATS":
      return getStats();
    case "RECORD_PROMPT":
      return recordPrompt(
        msg.payload.rawTokens,
        msg.payload.optimizedTokens
      );
    case "RECORD_RESPONSE":
      return recordResponse(
        msg.payload.rawTokens,
        msg.payload.cleanedTokens
      );
    case "RESET_SESSION":
      return resetSession();
    case "TOKEN_COUNT":
      return { tokens: countTokens(msg.payload.text) };
    case "OPEN_OPTIONS":
      // Content scripts can't open the options page themselves; we proxy it
      // through the service worker which has the privilege.
      try {
        if (chrome.runtime.openOptionsPage) {
          await chrome.runtime.openOptionsPage();
        } else {
          await chrome.tabs.create({
            url: chrome.runtime.getURL("options/options.html")
          });
        }
      } catch (e) {
        console.warn("[TokenGuard] openOptionsPage failed:", e);
      }
      return { ok: true };
    default: {
      const _exhaustive: never = msg;
      void _exhaustive;
      throw new Error(
        `Unknown message type: ${(msg as { type: string }).type}`
      );
    }
  }
}

async function optimizePrompt(text: string): Promise<OptimizedPrompt> {
  const settings = await loadSettings();
  const local = optimizePromptLocal(text);
  // If the user wired up a backend with an LLM rewrite, prefer it but fall
  // back to the local pass on any error so the UI never blocks.
  if (settings.optimizePrompt && settings.apiBaseUrl) {
    try {
      const url = `${settings.apiBaseUrl.replace(/\/$/, "")}/optimize-prompt`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {})
        },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const remote = (await res.json()) as OptimizedPrompt;
        // If remote wins on tokens, take it; otherwise keep local.
        if (remote.optimizedTokens < local.optimizedTokens) return remote;
      }
    } catch (e) {
      console.warn("[TokenGuard] backend optimize failed, using local:", e);
    }
  }
  return local;
}

async function enforceResponse(text: string): Promise<FluffScoreResult> {
  const settings = await loadSettings();
  const local = scoreFluff(text);
  if (settings.apiBaseUrl) {
    try {
      const url = `${settings.apiBaseUrl.replace(/\/$/, "")}/enforce-response`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {})
        },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const remote = (await res.json()) as FluffScoreResult;
        return remote;
      }
    } catch (e) {
      console.warn("[TokenGuard] backend enforce failed, using local:", e);
    }
  }
  return local;
}
