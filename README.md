# TokenGuard

A middleware layer that sits between you and any LLM chatbot — starting with **ChatGPT** and **Claude.ai** — to enforce radical response efficiency.

LLM providers are financially incentivized to maximize token usage. TokenGuard pushes back: it rewrites your prompts to be concise, injects a strict system-prompt enforcer, and strips fluff (recap openers, soft endings, hedge clusters, padding transitions, unsolicited alternatives, restatements) from responses before you read them.

## Repo layout

```
tokenguard/
├── shared/       # @tokenguard/shared — types, fluff patterns, scorers, tokenizer abstraction
├── extension/    # MV3 Chrome/Firefox extension (TS + esbuild)
├── backend/      # Express + TS API: /optimize-prompt, /enforce-response, /session-stats
└── dashboard/    # React + Tailwind + Recharts settings & analytics dashboard
```

The four packages are an npm workspace rooted at `tokenguard/package.json`. Run `npm install` once at the root to bootstrap them all.

## Quickstart

### 1. Install

```bash
cd tokenguard
npm install
```

### 2. Build the shared library (always do this first)

```bash
npm run build:shared
```

`shared` is referenced by `file:` from each workspace. Re-run this after editing anything in `shared/src/`.

### 3. Run the backend (optional but recommended)

```bash
cd backend
cp .env.example .env   # fill in OPENAI_API_KEY if you want LLM-powered prompt rewrites
npm run dev
# → backend listening on :3000
```

The backend works without `OPENAI_API_KEY` — it falls back to the deterministic local rule-based optimizer in `shared/src/promptOptimizer.ts`. Without `REDIS_URL` / `DATABASE_URL`, it uses in-memory stores; data resets on restart.

Endpoints:
- `POST /optimize-prompt` — `{ text }` → `OptimizedPrompt` (token diff + word-level diff ops)
- `POST /enforce-response` — `{ text }` → `FluffScoreResult` (score 0–100, flags, cleaned text)
- `GET /session-stats?days=14` — `{ session, daily[] }`
- `POST /session-stats/reset`

Auth: send the bearer token via `Authorization: Bearer …`. Optionally identify users via `x-user-id`. Lock down the API by setting `TOKENGUARD_API_KEY` in `.env`.

### 4. Run the dashboard

```bash
cd dashboard
npm run dev
# → http://localhost:5173
```

The dashboard has three tabs: **Dashboard** (token-savings graphs), **Playground** (paste a prompt + response and see the optimizer + fluff scorer live), **Settings** (point at your backend, set fluff threshold, edit the system-prompt template).

### 5. Build the extension

```bash
cd extension
npm run build
# → tokenguard/extension/dist/
```

Then load it as an unpacked extension:

- **Chrome / Edge**: `chrome://extensions` → enable Developer mode → "Load unpacked" → choose `tokenguard/extension/dist`.
- **Firefox**: `about:debugging` → This Firefox → "Load Temporary Add-on…" → pick `dist/manifest.json`.

For live development:

```bash
npm run build:watch -w @tokenguard/extension
```

Reload the extension in `chrome://extensions` after each rebuild.

## What the extension does

When you load `chatgpt.com` / `chat.openai.com` / `claude.ai`:

1. Mounts a **Shadow-DOM toolbar** (draggable, collapsible) showing live token totals, tokens saved, estimated cost, and the most recent fluff score.
2. Intercepts **Enter** and the **Send** button. Calls `OPTIMIZE_PROMPT` (backend if configured, else local rules) and shows a **diff overlay** (red strike-throughs for deletions, green highlights for insertions). You choose **Send optimized** or **Send as-is**.
3. On the first message of a chat (when no assistant messages exist yet), prepends the configurable **system-prompt enforcer** to your message. This is necessary because neither ChatGPT nor Claude expose a true system-message API to extensions.
4. Watches the page with a `MutationObserver` for new assistant messages. Once a message finishes streaming, it scores fluff client-side (regex, instant), and only round-trips to the backend if the score crosses the threshold. Flagged sentences get highlighted in-place, with a "Show cleaned" affordance.
5. Updates the popup token counter in real time (uses `tiktoken` WASM in the popup, with a heuristic fallback in content scripts where WASM isn't loaded).

User API keys go into `chrome.storage.sync`, never `localStorage`.

## Tests

```bash
npm test           # runs vitest in backend/, exercises the shared library
```

Currently 28 passing tests covering the sentence splitter, fluff scorer, fluff stripper, prompt optimizer, word diff, token counter, and cost estimation.

## Notes & constraints (from the brief)

- TypeScript everywhere.
- Toolbar uses Shadow DOM; host-page CSS cannot leak in.
- Backend `optimize` calls are debounced **300ms** in the dashboard playground (see `PromptPlayground.tsx`). The extension only calls on send, so debouncing isn't needed there.
- Fluff detection runs **client-side first** (regex via `scoreFluff`); the extension only round-trips to the backend when the local score exceeds the threshold.
- Toolbar is draggable.
- Unit tests for fluff scorer + token counter are in place from day one.

## Customization

- **System prompt template** — edit in the extension's options page or in the dashboard Settings tab. Each instance stores its own copy.
- **Fluff patterns** — edit `shared/src/fluffPatterns.ts` (and mirror to `shared/fluffPatterns.json`). Categories are weighted; weight 1.0 = a flagged sentence contributes one full unit to the percentage. Higher weights penalize more aggressively (soft endings = 1.2, etc.).
- **Pricing** — set in the extension options or dashboard. Defaults to `gpt-4o-mini`.

## License

MIT.
