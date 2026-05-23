import { useEffect, useMemo, useState } from "react";
import {
  countTokens,
  optimizePromptLocal,
  scoreFluff,
  type FluffScoreResult,
  type OptimizedPrompt
} from "@tokenguard/shared";
import type { ApiClient } from "../lib/api.js";
import { DiffViewer } from "./DiffViewer.js";
import { FluffScore } from "./FluffScore.js";

interface Props {
  client: ApiClient | null;
  threshold: number;
  onStatsChanged: () => void;
}

/**
 * Two-column scratchpad: prompt input on the left runs through the optimizer
 * (with debounce); response input runs through the fluff scorer. Both fall
 * back to local rules when no backend is configured.
 */
export function PromptPlayground({ client, threshold, onStatsChanged }: Props) {
  const [prompt, setPrompt] = useState(
    "Hi there! Could you please tell me, in detail, what the capital of France is, thanks!"
  );
  const [response, setResponse] = useState(
    "Great question! The capital of France is Paris. It's worth noting that Paris is also a global cultural hub. Hope this helps! Let me know if you have any other questions."
  );
  const [optimized, setOptimized] = useState<OptimizedPrompt | null>(null);
  const [fluff, setFluff] = useState<FluffScoreResult | null>(null);
  const [optimizing, setOptimizing] = useState(false);

  // Debounce optimize calls @ 300ms.
  useEffect(() => {
    const id = window.setTimeout(async () => {
      if (!prompt.trim()) {
        setOptimized(null);
        return;
      }
      setOptimizing(true);
      try {
        const result = client
          ? await client.optimize(prompt).catch(() => optimizePromptLocal(prompt))
          : optimizePromptLocal(prompt);
        setOptimized(result);
        onStatsChanged();
      } finally {
        setOptimizing(false);
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [prompt, client, onStatsChanged]);

  // Score fluff locally on every keystroke (cheap), and ping backend on blur.
  useEffect(() => {
    if (!response.trim()) {
      setFluff(null);
      return;
    }
    setFluff(scoreFluff(response));
  }, [response]);

  const promptTokens = useMemo(() => countTokens(prompt), [prompt]);
  const optimizedTokens = optimized?.optimizedTokens ?? promptTokens;

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div className="card-title mb-0">Prompt optimizer</div>
          <span className="pill">
            {promptTokens} → {optimizedTokens} · saved{" "}
            {Math.max(0, promptTokens - optimizedTokens)}
          </span>
        </div>
        <textarea
          className="input h-32"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Type a prompt…"
        />
        {optimized && optimized.optimized !== prompt && (
          <DiffViewer before={prompt} after={optimized.optimized} />
        )}
        {optimizing && <div className="text-xs text-muted">Optimizing…</div>}
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div className="card-title mb-0">Fluff scorer</div>
          <button
            className="btn"
            onClick={async () => {
              if (!client) return;
              try {
                const r = await client.enforce(response);
                setFluff(r);
                onStatsChanged();
              } catch {
                // local fluff already shown
              }
            }}
          >
            Run server pass
          </button>
        </div>
        <textarea
          className="input h-32"
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Paste an LLM response…"
        />
      </div>

      <div className="md:col-span-2">
        <FluffScore result={fluff} threshold={threshold} />
      </div>

      <style>{`
        .input {
          width: 100%;
          background: #0f1115;
          border: 1px solid rgba(255,255,255,0.08);
          color: #f5f5f7;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 13px;
          box-sizing: border-box;
          font-family: ui-monospace, Menlo, monospace;
          resize: vertical;
        }
      `}</style>
    </div>
  );
}
