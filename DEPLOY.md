# Deploying TokenGuard

This walks through publishing the extension to the **Chrome Web Store** (and Firefox AMO), plus optionally hosting the backend so users get LLM-powered prompt rewrites.

## TL;DR

1. **Bump version** in `extension/src/manifest.json` (Chrome won't let you re-upload the same version).
2. `cd extension && npm run package` — produces `extension/release/tokenguard-vX.Y.Z.zip`.
3. Upload the zip to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
4. Fill the listing (description, screenshots, privacy policy URL).
5. Submit for review. Most reviews complete in 1–7 business days.

The default-shipped extension works **fully offline** — no backend required for first install.

---

## Step 1 — Register a Chrome Web Store developer account

- Go to <https://chrome.google.com/webstore/devconsole/>
- Sign in with the Google account you want to publish under
- Pay the **one-time $5 registration fee**
- (Optional) Set up a **group publisher** if you want a brand name on the listing instead of your own

## Step 2 — Build the release artifact

```bash
cd tokenguard
npm install
npm run build:shared

cd extension
npm run package
```

You'll get two files in `extension/release/`:

- `tokenguard-vX.Y.Z.zip` → upload to the **Chrome Web Store**
- `tokenguard-vX.Y.Z.xpi` → upload to **Firefox AMO** (`addons.mozilla.org`)

The packager strips source maps and `.DS_Store` files automatically.

## Step 3 — Create the listing

In the Web Store Developer Dashboard click **New item** and upload the zip.

You'll be asked for:

| Field | What we recommend |
| --- | --- |
| Name | `TokenGuard — Concise LLM Replies` |
| Summary (≤132 chars) | `Force ChatGPT and Claude to be direct. Strip fluff, optimize prompts, and track tokens saved.` |
| Description | See `DESCRIPTION.md` below — paste the long version. |
| Category | `Productivity` |
| Language | English (and any others you want to localize) |
| Store icon (128×128) | `extension/icons/icon-128.png` |
| Promo tile small (440×280) | `extension/icons/promo-small-440x280.png` |
| Promo tile large (920×680) | `extension/icons/promo-large-920x680.png` |
| Marquee (1400×560, optional, required for "featured") | `extension/icons/promo-marquee-1400x560.png` |
| Screenshots (1280×800 or 640×400, 1–5 required) | Take real screenshots — see Step 4 |
| Privacy policy URL | Host `PRIVACY.md` somewhere public (GitHub Pages, your site, etc.) and paste the URL |
| Single-purpose description | "Make LLM chatbot replies more concise by intercepting prompts and stripping fluff from responses." |
| Permission justifications | See below |

### Permission justifications (paste verbatim)

- **`storage`** — required to persist user settings (system prompt template, fluff threshold, optional backend URL) via `chrome.storage.sync`, and session counters via `chrome.storage.local`. No data leaves the device.
- **`host_permissions` for chat.openai.com / chatgpt.com / claude.ai** — required to inject the floating toolbar into the chat UI, intercept the send action so the user can review the optimized prompt, and read assistant message content for fluff scoring. The extension does not access any other websites.

## Step 4 — Take screenshots

You need **at least one** 1280×800 (preferred) or 640×400 PNG/JPEG. Recommended captures:

1. Floating toolbar visible on top of an active ChatGPT conversation, showing live token totals.
2. The diff overlay open with red/green word-level diff for an optimized prompt.
3. An assistant message annotated with a fluff score and "Show cleaned" button.
4. Popup window showing session totals and the live token counter.
5. Options page with the system-prompt template editor.

To capture: load the extension as **unpacked** (`chrome://extensions` → Load unpacked → pick `extension/dist/`), open ChatGPT, and use **macOS Cmd+Shift+4 + Space** or Chrome DevTools' device emulator at 1280×800.

## Step 5 — Submit & wait for review

Click **Submit for review**. Reviews usually take 1–7 business days. Common rejection reasons we've already engineered around:

- ✅ Single purpose declared (concise LLM responses)
- ✅ Minimal permissions (only `storage` + targeted `host_permissions`)
- ✅ No remote code (all JS bundled at build time, no `eval`, no remote `<script>` injection)
- ✅ Privacy policy provided and matches behavior
- ✅ Clear data handling: works fully local by default

If reviewers flag something, the most common ask is **a clearer description of why each `host_permission` is needed**. The justifications above usually pass.

## Step 6 — Publish & roll out

After approval, you choose your visibility:

- **Public** — anyone can find it on the store
- **Unlisted** — only people with the link can install (good for early access)
- **Private** — only allow-listed accounts

You can also gate releases by **percentage rollout** (e.g., 10% / 50% / 100%) so a bad update doesn't reach everyone at once.

---

## Firefox AMO

The same `dist/` ships to Firefox unchanged thanks to the `browser_specific_settings.gecko` block in the manifest.

1. Sign in at <https://addons.mozilla.org/developers/>
2. Click **Submit a new add-on**
3. Choose **listed** (or self-hosted/unlisted)
4. Upload `extension/release/tokenguard-vX.Y.Z.xpi`
5. AMO usually reviews within hours to a day
6. The same listing copy from `DESCRIPTION.md` works

Mozilla also requires a privacy policy URL and source code disclosure if you minify aggressively (we don't — esbuild output is readable).

---

## Hosting the backend (optional)

The default extension runs fully locally. If you want to offer the LLM-rewrite feature to all users, host the backend somewhere reachable.

### Option A: Render / Railway / Fly.io (simplest)

```bash
cd backend
# Render — uses the included start command
#   - Service type: Web Service
#   - Build command: npm install && npm run build
#   - Start command: npm start
#   - Env vars:
#       OPENAI_API_KEY=sk-...
#       OPENAI_MODEL=gpt-4o-mini
#       TOKENGUARD_API_KEY=<a long random string you generate>
#       CORS_ORIGINS=chrome-extension://*,moz-extension://*
```

Add a managed Postgres + Redis in the same project for cross-device history; the backend auto-detects `DATABASE_URL` and `REDIS_URL`.

### Option B: Docker

A minimal `Dockerfile` you can drop in `backend/`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY shared ../shared
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend ./
RUN npm run build
EXPOSE 3000
CMD ["npm","start"]
```

### After it's live

Tell users to:

1. Open the extension's options page.
2. Paste the backend URL (e.g. `https://tokenguard-api.example.com`).
3. Paste the API key (matches `TOKENGUARD_API_KEY` on the server).
4. Save.

The extension will start hitting the backend for prompt optimization and fluff classification. If the backend goes down, it transparently falls back to the local rule-based passes — users keep working.

### Cost guardrails

Each `/optimize-prompt` call is a single `gpt-4o-mini` request capped at `~max_tokens = original × 1.1 + 32`. At list price (~$0.15 / 1M input tokens, ~$0.60 / 1M output) a power user doing 1,000 prompts/day at 200-token average pays roughly **$0.10 / day**. Keep `TOKENGUARD_API_KEY` set so randos can't pound your endpoint, and the rate limiters are already on (120 optimize/min, 240 enforce/min per IP).

---

## Releasing updates

1. Edit `extension/src/manifest.json` — bump `version` (Chrome requires monotonically increasing).
2. Tag the change in git: `git tag vX.Y.Z && git push --tags`.
3. `npm run package` in `extension/`.
4. Upload the new zip to the Web Store dashboard → submit for review.

Chrome auto-updates installed extensions to the new version usually within a few hours of approval.
