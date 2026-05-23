import type {
  FluffScoreResult,
  OptimizedPrompt,
  SessionStats,
  TokenGuardSettings
} from "@tokenguard/shared";

export interface ToolbarHandlers {
  onSendOptimized: (optimized: string) => void;
  onSendOriginal: (original: string) => void;
  onToggleEnforcer: (enabled: boolean) => void;
  onUpdateThreshold: (value: number) => void;
}

export interface Toolbar {
  showDiff(prompt: OptimizedPrompt): Promise<"optimized" | "original" | "cancel">;
  setStats(stats: SessionStats, pricing: TokenGuardSettings["pricing"]): void;
  setLastFluff(result: FluffScoreResult | null): void;
  setHost(name: string): void;
  destroy(): void;
}

const STYLE = `
:host { all: initial; }
.tg-root {
  position: fixed;
  z-index: 2147483647;
  top: 16px;
  right: 16px;
  width: 320px;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: #f5f5f7;
  background: rgba(20, 22, 28, 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  box-shadow: 0 10px 28px rgba(0,0,0,0.35);
  user-select: none;
  overflow: hidden;
}
.tg-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: linear-gradient(90deg, #2a2f3a 0%, #1f242e 100%);
  cursor: grab;
}
.tg-header.dragging { cursor: grabbing; }
.tg-title { font-size: 12px; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; color: #9aa3b2; }
.tg-host { font-size: 11px; color: #6b7385; margin-top: 2px; }
.tg-actions { display: flex; gap: 6px; }
.tg-btn {
  background: rgba(255,255,255,0.06);
  color: #f5f5f7;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
}
.tg-btn:hover { background: rgba(255,255,255,0.12); }
.tg-btn.primary { background: #4f7cff; border-color: #4f7cff; }
.tg-btn.primary:hover { background: #6790ff; }
.tg-btn.danger { background: rgba(239, 68, 68, 0.2); border-color: rgba(239,68,68,0.4); color: #fecaca; }
.tg-body { padding: 10px 12px; }
.tg-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 12px; }
.tg-row .label { color: #9aa3b2; }
.tg-row .value { font-variant-numeric: tabular-nums; font-weight: 600; color: #f5f5f7; }
.tg-row .value.green { color: #6ee7a3; }
.tg-row .value.red { color: #fda4a4; }
.tg-progress {
  width: 100%;
  height: 6px;
  background: rgba(255,255,255,0.06);
  border-radius: 999px;
  margin: 8px 0;
  overflow: hidden;
}
.tg-progress > div {
  height: 100%;
  background: linear-gradient(90deg, #6ee7a3, #4f7cff);
  width: 0%;
  transition: width 200ms ease;
}
.tg-fluff {
  font-size: 11px;
  color: #9aa3b2;
  margin-top: 6px;
}
.tg-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 10px -12px; }
.tg-controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.tg-toggle {
  display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: #cbd1da;
}
.tg-toggle input { accent-color: #4f7cff; }

/* Modal */
.tg-modal {
  position: fixed; inset: 0; z-index: 2147483647;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
.tg-modal-card {
  width: min(720px, 92vw);
  max-height: 80vh;
  background: #181b22;
  color: #f5f5f7;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 30px 80px rgba(0,0,0,0.55);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.tg-modal-head {
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex; justify-content: space-between; align-items: center;
}
.tg-modal-title { font-size: 14px; font-weight: 600; }
.tg-modal-sub { font-size: 12px; color: #9aa3b2; }
.tg-diff {
  padding: 14px 18px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  flex: 1;
}
.tg-diff .ins { background: rgba(110, 231, 163, 0.18); color: #b6f0cf; border-radius: 3px; padding: 0 2px; }
.tg-diff .del { background: rgba(253, 164, 164, 0.16); color: #fda4a4; text-decoration: line-through; border-radius: 3px; padding: 0 2px; }
.tg-modal-foot {
  display: flex; justify-content: space-between; align-items: center; gap: 8px;
  padding: 12px 18px; border-top: 1px solid rgba(255,255,255,0.06);
  background: #14171c;
}
.tg-foot-stats { font-size: 12px; color: #9aa3b2; }
.tg-foot-stats b { color: #6ee7a3; font-variant-numeric: tabular-nums; }
.tg-foot-actions { display: flex; gap: 8px; }
`;

export function mountToolbar(handlers: ToolbarHandlers): Toolbar {
  const host = document.createElement("div");
  host.id = "tokenguard-host";
  host.style.all = "initial";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = STYLE;
  shadow.appendChild(style);

  const root = document.createElement("div");
  root.className = "tg-root";
  shadow.appendChild(root);

  root.innerHTML = `
    <div class="tg-header" id="tg-header">
      <div>
        <div class="tg-title">TokenGuard</div>
        <div class="tg-host" id="tg-host">—</div>
      </div>
      <div class="tg-actions">
        <button class="tg-btn" id="tg-options" title="Open options">⚙</button>
        <button class="tg-btn" id="tg-collapse" title="Collapse">–</button>
      </div>
    </div>
    <div class="tg-body" id="tg-body">
      <div class="tg-row"><span class="label">Tokens this session</span><span class="value" id="tg-total">0</span></div>
      <div class="tg-row"><span class="label">Saved by TokenGuard</span><span class="value green" id="tg-saved">0</span></div>
      <div class="tg-row"><span class="label">Estimated cost</span><span class="value" id="tg-cost">$0.0000</span></div>
      <div class="tg-progress"><div id="tg-bar"></div></div>
      <div class="tg-fluff" id="tg-fluff">No response analyzed yet.</div>
      <div class="tg-divider"></div>
      <div class="tg-controls">
        <label class="tg-toggle"><input type="checkbox" id="tg-enforcer" checked> Enforcer</label>
        <label class="tg-toggle">Fluff ≥ <input type="number" id="tg-threshold" min="0" max="100" step="5" value="35" style="width:48px;background:rgba(255,255,255,0.06);color:#fff;border:1px solid rgba(255,255,255,0.08);border-radius:4px;padding:2px 4px;font-size:11px;"></label>
      </div>
    </div>
  `;

  const $ = <T extends Element = Element>(sel: string) =>
    shadow.querySelector(sel) as T;

  // Drag.
  const header = $("#tg-header") as HTMLElement;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  header.addEventListener("mousedown", (e) => {
    dragging = true;
    header.classList.add("dragging");
    const rect = root.getBoundingClientRect();
    originLeft = rect.left;
    originTop = rect.top;
    startX = e.clientX;
    startY = e.clientY;
    root.style.right = "auto";
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const left = Math.max(8, originLeft + (e.clientX - startX));
    const top = Math.max(8, originTop + (e.clientY - startY));
    root.style.left = `${left}px`;
    root.style.top = `${top}px`;
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
    header.classList.remove("dragging");
  });

  ($("#tg-collapse") as HTMLButtonElement).addEventListener("click", () => {
    const body = $("#tg-body") as HTMLElement;
    body.style.display = body.style.display === "none" ? "" : "none";
  });
  ($("#tg-options") as HTMLButtonElement).addEventListener("click", () => {
    // Content scripts can't open the options page; ask the service worker.
    chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" }, () => {
      // Swallow lastError — chrome populates it if the SW is asleep, but
      // it wakes for the message and opens the page anyway.
      void chrome.runtime.lastError;
    });
  });
  ($("#tg-enforcer") as HTMLInputElement).addEventListener("change", (e) => {
    handlers.onToggleEnforcer((e.target as HTMLInputElement).checked);
  });
  ($("#tg-threshold") as HTMLInputElement).addEventListener("change", (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    handlers.onUpdateThreshold(Math.max(0, Math.min(100, value)));
  });

  function setStats(
    stats: SessionStats,
    pricing: TokenGuardSettings["pricing"]
  ) {
    const total =
      stats.promptTokensOptimized + stats.responseTokensCleaned;
    const saved =
      Math.max(0, stats.promptTokensRaw - stats.promptTokensOptimized) +
      Math.max(0, stats.responseTokensRaw - stats.responseTokensCleaned);
    ($("#tg-total") as HTMLElement).textContent = total.toLocaleString();
    ($("#tg-saved") as HTMLElement).textContent = saved.toLocaleString();
    const inputUsd =
      (stats.promptTokensOptimized / 1000) * pricing.inputPerK;
    const outputUsd =
      (stats.responseTokensCleaned / 1000) * pricing.outputPerK;
    const total$ = inputUsd + outputUsd;
    ($("#tg-cost") as HTMLElement).textContent = `$${total$.toFixed(4)}`;
    const denom = total + saved || 1;
    const pct = Math.min(100, Math.round((saved / denom) * 100));
    ($("#tg-bar") as HTMLElement).style.width = `${pct}%`;
  }

  function setLastFluff(result: FluffScoreResult | null) {
    const el = $("#tg-fluff") as HTMLElement;
    if (!result) {
      el.textContent = "No response analyzed yet.";
      return;
    }
    const flagged = result.flags.length;
    el.innerHTML = `Last response fluff score <b style="color:${
      result.score > 50 ? "#fda4a4" : result.score > 25 ? "#facc15" : "#6ee7a3"
    }">${result.score}</b> · ${flagged}/${result.totalSentences} flagged`;
  }

  function setHost(name: string) {
    ($("#tg-host") as HTMLElement).textContent = name;
  }

  function showDiff(prompt: OptimizedPrompt) {
    return new Promise<"optimized" | "original" | "cancel">((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "tg-modal";
      overlay.innerHTML = `
        <div class="tg-modal-card">
          <div class="tg-modal-head">
            <div>
              <div class="tg-modal-title">Optimized prompt</div>
              <div class="tg-modal-sub">Review TokenGuard's rewrite before sending.</div>
            </div>
            <button class="tg-btn" id="tg-modal-close">✕</button>
          </div>
          <div class="tg-diff" id="tg-diff"></div>
          <div class="tg-modal-foot">
            <div class="tg-foot-stats">
              ${prompt.originalTokens} → ${prompt.optimizedTokens} tokens · saved <b>${prompt.savedTokens}</b>
            </div>
            <div class="tg-foot-actions">
              <button class="tg-btn" id="tg-send-original">Send as-is</button>
              <button class="tg-btn primary" id="tg-send-optimized">Send optimized</button>
            </div>
          </div>
        </div>
      `;
      shadow.appendChild(overlay);

      const diffEl = overlay.querySelector("#tg-diff") as HTMLElement;
      diffEl.innerHTML = "";
      for (const op of prompt.diff) {
        const span = document.createElement("span");
        if (op.kind === "insert") span.className = "ins";
        else if (op.kind === "delete") span.className = "del";
        span.textContent = op.value;
        diffEl.appendChild(span);
      }

      const close = (kind: "optimized" | "original" | "cancel") => {
        overlay.remove();
        resolve(kind);
      };
      overlay
        .querySelector("#tg-modal-close")
        ?.addEventListener("click", () => close("cancel"));
      overlay
        .querySelector("#tg-send-original")
        ?.addEventListener("click", () => close("original"));
      overlay
        .querySelector("#tg-send-optimized")
        ?.addEventListener("click", () => close("optimized"));
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close("cancel");
      });
    });
  }

  function destroy() {
    host.remove();
  }

  return { showDiff, setStats, setLastFluff, setHost, destroy };
}
