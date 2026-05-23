---
title: TokenGuard
layout: default
---

# TokenGuard

**Force ChatGPT and Claude to be direct.** A browser extension + open-source backend that strips fluff, optimizes prompts, and tracks tokens saved.

LLM providers are paid by the token. They're financially incentivized to pad responses with "Great question!", "Hope this helps!", "It's worth noting…", and three-paragraph recaps of what you just asked. TokenGuard pushes back.

- **Optimized prompts** — see a side-by-side diff of your prompt vs. the rewritten version before sending; pick *Send optimized* or *Send as-is*.
- **System-prompt enforcer** — automatically prepends a strict, customizable rule set to new chats.
- **Fluff scoring** — every response gets a 0–100 fluff score; sentences crossing the threshold are highlighted with a one-click *Show cleaned* button.
- **Token dashboard** — live counts of tokens used, tokens saved, and USD cost per session.
- **Privacy-first** — runs fully locally by default. Optional self-hosted backend for LLM-powered rewrites.

## Links

- [Source code on GitHub](https://github.com/hethb/TokenGuard)
- [Privacy policy](./privacy)
- [Deployment guide](https://github.com/hethb/TokenGuard/blob/main/DEPLOY.md)

## Install

The extension is heading to the Chrome Web Store. In the meantime, you can build it from source — see the [README](https://github.com/hethb/TokenGuard#readme) for instructions.
