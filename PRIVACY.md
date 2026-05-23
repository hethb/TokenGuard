---
title: Privacy Policy
layout: default
permalink: /privacy/
---

# TokenGuard — Privacy Policy

_Last updated: 2026-05-22_

TokenGuard is a browser extension that helps you keep LLM chatbot conversations concise. We take privacy seriously. The default mode of TokenGuard processes everything **locally on your device** — your prompts and the chatbot's responses never leave your browser.

## What data TokenGuard handles

When you use TokenGuard on `chatgpt.com`, `chat.openai.com`, or `claude.ai`:

- **Your prompts and the chatbot's responses are read locally in your browser** to compute token counts, score "fluff" patterns with regex, and produce optimized rewrites.
- **Aggregate counters** (tokens used, tokens saved, fluff scores) are stored in `chrome.storage.local` to power the popup and options page. These never leave your device.
- **Settings** (system prompt template, fluff threshold, pricing, optional backend URL/key) are stored in `chrome.storage.sync`. Chrome may sync these across your signed-in browsers; we do not have access to them.

## What we do NOT do (in default / local mode)

- We do **not** transmit your prompts or chatbot responses to any server.
- We do **not** collect analytics, telemetry, or crash reports.
- We do **not** use cookies or fingerprinting.
- We do **not** sell, share, or monetize any user data.

## Optional backend mode

TokenGuard supports an optional self-hosted backend that you can configure in the options page. If you set a backend URL:

- Prompts you opt to optimize are sent to **the backend you configured** (under your control). The backend may, in turn, call OpenAI's `gpt-4o-mini` API for an LLM-powered rewrite, depending on its configuration.
- Response text that exceeds your fluff threshold may be sent to the same backend for stricter classification.
- Aggregate token counts are sent for cross-device history.

You are responsible for the privacy practices of any backend you point TokenGuard at. Source code for the reference backend is available alongside this extension.

We do **not** operate or have access to any user-configured backend.

## Permissions used

- `storage` — to save your settings and session counters locally.
- `host_permissions` for `chatgpt.com`, `chat.openai.com`, and `claude.ai` — required to inject the toolbar, intercept the send action, and read assistant message content. We do not access any other websites.

## Contact

Questions or concerns: open an issue at the repository, or email the maintainer listed on the Chrome Web Store listing.

## Changes

This policy may be updated. Material changes will be announced in the extension's update notes.
