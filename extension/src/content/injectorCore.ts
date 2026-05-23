import {
  countTokens,
  scoreFluff,
  stripObviousFluff,
  type FluffScoreResult,
  type OptimizedPrompt,
  type SessionStats,
  type TokenGuardSettings
} from "@tokenguard/shared";
import { mountToolbar, type Toolbar } from "./ui-toolbar.js";
import { sendMessage } from "../shared/messages.js";
import {
  loadSettings,
  saveSettings,
  watchSettings
} from "../shared/settings.js";
import type { ChatPlatform } from "./chatPlatform.js";

/**
 * Core wiring shared between ChatGPT and Claude injectors. Handles:
 *  - injecting the floating toolbar
 *  - intercepting the send action to show the diff overlay
 *  - watching the DOM for new assistant messages and stripping fluff
 *  - prepending the system prompt to the *first* user message in a chat
 */
export async function startInjector(platform: ChatPlatform): Promise<void> {
  let settings = await loadSettings();
  let toolbar: Toolbar | null = null;
  let intercepting = false;
  // Track which assistant nodes we've already cleaned to avoid loops with
  // our own DOM mutations.
  const processedAssistantNodes = new WeakSet<HTMLElement>();
  // Track whether we've already injected the system prompt prefix in this
  // chat. We only inject once per page-load to avoid spamming the model.
  let systemPromptInjectedThisLoad = false;

  function ensureToolbar() {
    if (toolbar) return toolbar;
    toolbar = mountToolbar({
      onSendOptimized: () => {},
      onSendOriginal: () => {},
      onToggleEnforcer: async (enabled) => {
        settings = await saveSettings({ enabled });
      },
      onUpdateThreshold: async (value) => {
        settings = await saveSettings({ fluffThreshold: value });
      }
    });
    toolbar.setHost(platform.name);
    refreshToolbarStats();
    return toolbar;
  }

  async function refreshToolbarStats() {
    if (!toolbar) return;
    try {
      const stats = (await sendMessage({
        type: "GET_SESSION_STATS"
      })) as SessionStats;
      toolbar.setStats(stats, settings.pricing);
    } catch (e) {
      console.warn("[TokenGuard] failed to fetch stats:", e);
    }
  }

  watchSettings((next) => {
    settings = next;
    refreshToolbarStats();
  });

  ensureToolbar();

  // ── Prompt interception ───────────────────────────────────────────────
  document.addEventListener(
    "keydown",
    async (e) => {
      if (!settings.enabled) return;
      if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
      const input = platform.findPromptInput();
      if (!input || !input.contains(document.activeElement) && document.activeElement !== input) {
        return;
      }
      await maybeInterceptSend(e);
    },
    true
  );

  document.addEventListener(
    "click",
    async (e) => {
      if (!settings.enabled) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const send = platform.findSendButton();
      if (!send) return;
      if (target === send || send.contains(target)) {
        await maybeInterceptSend(e);
      }
    },
    true
  );

  async function maybeInterceptSend(e: Event) {
    if (intercepting) return;
    const input = platform.findPromptInput();
    if (!input) return;
    const raw = platform.readPrompt(input).trim();
    if (!raw) return;

    // Decide what to actually send.
    let finalText = raw;

    if (settings.optimizePrompt && settings.showDiffOverlay) {
      try {
        intercepting = true;
        e.preventDefault();
        e.stopImmediatePropagation();

        const optimized = (await sendMessage({
          type: "OPTIMIZE_PROMPT",
          payload: { text: raw }
        })) as OptimizedPrompt;

        if (optimized.optimized.trim() === raw.trim()) {
          // Nothing to show — fall through.
          finalText = raw;
        } else {
          const tb = ensureToolbar();
          const decision = await tb.showDiff(optimized);
          if (decision === "cancel") {
            intercepting = false;
            return;
          }
          finalText =
            decision === "optimized" ? optimized.optimized : raw;
          await sendMessage({
            type: "RECORD_PROMPT",
            payload: {
              rawTokens: optimized.originalTokens,
              optimizedTokens:
                decision === "optimized"
                  ? optimized.optimizedTokens
                  : optimized.originalTokens
            }
          });
        }
      } catch (err) {
        console.warn("[TokenGuard] optimize failed, sending raw:", err);
        finalText = raw;
      } finally {
        intercepting = false;
      }
    }

    // Optionally prepend the system-prompt enforcer to the first message
    // of the chat. We do this in-prompt because neither ChatGPT nor Claude
    // expose a system-message API to extensions.
    if (
      settings.enforceSystemPrompt &&
      !systemPromptInjectedThisLoad &&
      isFirstMessageInChat()
    ) {
      finalText = `${settings.systemPromptTemplate}\n\n---\n\n${finalText}`;
      systemPromptInjectedThisLoad = true;
    }

    if (finalText !== raw) {
      platform.writePrompt(input, finalText);
      // Re-trigger the original send. Browsers debounce synthetic clicks
      // so we wait a tick for the input event to settle.
      setTimeout(() => {
        const btn = platform.findSendButton();
        btn?.click();
      }, 30);
      refreshToolbarStats();
    }
  }

  function isFirstMessageInChat(): boolean {
    return platform.findAssistantMessages().length === 0;
  }

  // ── Response observation ──────────────────────────────────────────────
  const observer = new MutationObserver(() => {
    if (!settings.enabled) return;
    void scanAssistantMessages();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  async function scanAssistantMessages() {
    const messages = platform.findAssistantMessages();
    for (const msg of messages) {
      if (processedAssistantNodes.has(msg)) continue;
      // Skip messages that are still streaming. ChatGPT sets
      // `data-message-streaming` while Claude exposes `data-is-streaming`.
      const streaming =
        msg.getAttribute("data-message-streaming") === "true" ||
        msg.hasAttribute("data-is-streaming");
      if (streaming) continue;

      const text = platform.readAssistantText(msg);
      if (!text || text.length < 8) continue;
      processedAssistantNodes.add(msg);
      await processAssistantText(msg, text);
    }
  }

  async function processAssistantText(node: HTMLElement, text: string) {
    const localScore: FluffScoreResult = scoreFluff(text);
    let result = localScore;

    if (localScore.score >= settings.fluffThreshold) {
      try {
        result = (await sendMessage({
          type: "ENFORCE_RESPONSE",
          payload: { text }
        })) as FluffScoreResult;
      } catch {
        result = localScore;
      }
    }

    if (result.score >= settings.fluffThreshold) {
      const cleaned = stripObviousFluff(result.cleanedText || text);
      annotateNode(node, result, cleaned);
      const before = countTokens(text);
      const after = countTokens(cleaned);
      await sendMessage({
        type: "RECORD_RESPONSE",
        payload: { rawTokens: before, cleanedTokens: after }
      });
    } else {
      // Even without rewriting, count the response tokens so the user
      // sees their session totals tick up.
      const tokens = countTokens(text);
      await sendMessage({
        type: "RECORD_RESPONSE",
        payload: { rawTokens: tokens, cleanedTokens: tokens }
      });
    }

    toolbar?.setLastFluff(result);
    refreshToolbarStats();
  }

  function annotateNode(
    node: HTMLElement,
    result: FluffScoreResult,
    cleaned: string
  ) {
    if (node.dataset.tgAnnotated === "1") return;
    node.dataset.tgAnnotated = "1";

    const banner = document.createElement("div");
    banner.style.cssText = `
      margin: 8px 0; padding: 8px 10px; border-radius: 8px;
      background: rgba(79, 124, 255, 0.08); border: 1px solid rgba(79,124,255,0.25);
      color: inherit; font-size: 12px; line-height: 1.4;
    `;
    banner.innerHTML = `
      <strong>TokenGuard:</strong> fluff score
      <span style="color:${result.score > 50 ? "#dc2626" : result.score > 25 ? "#d97706" : "#059669"}">
        ${result.score}
      </span>
      · ${result.flags.length}/${result.totalSentences} sentences flagged.
      <button data-tg-cleaned style="margin-left:8px;font-size:11px;background:transparent;border:1px solid currentColor;border-radius:6px;padding:2px 6px;cursor:pointer;color:inherit;">
        Show cleaned
      </button>
    `;
    node.prepend(banner);
    banner.querySelector("[data-tg-cleaned]")?.addEventListener("click", () => {
      const pre = document.createElement("blockquote");
      pre.style.cssText =
        "margin:6px 0;padding:8px 10px;border-left:3px solid #4f7cff;background:rgba(79,124,255,0.05);white-space:pre-wrap;";
      pre.textContent = cleaned;
      banner.after(pre);
    });

    // Highlight flagged spans.
    for (const flag of result.flags) {
      try {
        highlightSentence(node, flag.sentence);
      } catch {
        // Best-effort only.
      }
    }
  }

  function highlightSentence(scope: HTMLElement, sentence: string): void {
    if (!sentence || sentence.length < 6) return;
    const walker = document.createTreeWalker(
      scope,
      NodeFilter.SHOW_TEXT,
      null
    );
    const targets: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const t = n as Text;
      if (t.nodeValue && t.nodeValue.includes(sentence)) targets.push(t);
    }
    for (const text of targets) {
      const idx = text.nodeValue!.indexOf(sentence);
      if (idx < 0) continue;
      const before = text.nodeValue!.slice(0, idx);
      const after = text.nodeValue!.slice(idx + sentence.length);
      const span = document.createElement("mark");
      span.style.cssText =
        "background: rgba(253,164,164,0.25); border-radius:3px; padding: 0 2px;";
      span.textContent = sentence;
      const parent = text.parentNode;
      if (!parent) continue;
      parent.insertBefore(document.createTextNode(before), text);
      parent.insertBefore(span, text);
      parent.insertBefore(document.createTextNode(after), text);
      parent.removeChild(text);
    }
  }
}
