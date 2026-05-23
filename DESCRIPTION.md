# Chrome Web Store listing copy

Paste each section into the matching field in the Web Store dashboard.

---

## Summary (132 char max)

Force ChatGPT and Claude to be direct. Strip fluff, optimize prompts, and track tokens saved — all locally.

---

## Detailed description

LLM chatbots are paid by the token. They're financially incentivized to pad responses with "Great question!", "Hope this helps!", "It's worth noting…", and three-paragraph recaps of what you just asked. TokenGuard pushes back.

**What it does**

• Optimizes your prompts before they're sent — strips filler ("could you please…", "I was wondering if…", "thanks in advance!"), shows you a side-by-side diff with red/green word-level highlights, and lets you choose **Send optimized** or **Send as-is**.

• Injects a strict, customizable system-prompt enforcer at the start of each new chat that tells the model to answer only what was asked, never to recap, never to ask follow-ups it doesn't need, and never to end with filler like "Let me know if you have any questions!"

• Scores every assistant response on a 0–100 fluff scale using six pattern categories (recap openers, soft endings, hedge clusters, padding transitions, unsolicited alternatives, restatements). Above your threshold, fluffy sentences are highlighted and a clean version is offered.

• Tracks tokens used vs. tokens saved per session, with estimated cost in USD, and provides a draggable in-page toolbar so you can see it all without switching tabs.

**Privacy-first by default**

TokenGuard runs **entirely locally** out of the box. Your prompts and the chatbot's responses never leave your browser. No analytics, no telemetry, no cookies, no fingerprinting.

Power users who want LLM-powered prompt rewrites can optionally point the extension at a self-hosted backend (open source, MIT). The extension transparently falls back to local rules if the backend is unavailable.

**Works on**

• ChatGPT (chat.openai.com, chatgpt.com)
• Claude (claude.ai)

**Open source**

Source code is available at the linked repository. Built with Manifest V3, TypeScript, and a Shadow-DOM toolbar that won't conflict with the host page's CSS.

---

## Single-purpose description

Make LLM chatbot replies more concise by intercepting prompts and stripping fluff from responses on supported chat sites (ChatGPT and Claude.ai).

---

## Permission justifications

**`storage`** — Required to persist user settings (system prompt template, fluff threshold, optional backend URL) via `chrome.storage.sync`, and session token counters via `chrome.storage.local`. No data ever leaves the device.

**Host permission for `chat.openai.com`, `chatgpt.com`, `claude.ai`** — Required to inject the floating toolbar into the chat UI, intercept the send action so the user can review the optimized prompt before it's sent, and read assistant message content to score it for fluff. The extension does not access any other websites.
