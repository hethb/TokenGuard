import { useEffect, useState } from "react";
import { DEFAULT_SYSTEM_PROMPT } from "@tokenguard/shared";

export interface DashboardSettings {
  apiBaseUrl: string;
  apiKey: string;
  userId: string;
  fluffThreshold: number;
  modelLabel: string;
  inputPerK: number;
  outputPerK: number;
  systemPromptTemplate: string;
}

interface Props {
  initial: DashboardSettings;
  onSave: (next: DashboardSettings) => void;
}

const STORAGE_KEY = "tokenguard.dashboard.settings";

export function loadDashboardSettings(): DashboardSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...(JSON.parse(raw) as DashboardSettings) };
  } catch {
    // ignore
  }
  return defaults;
}

export function saveDashboardSettings(s: DashboardSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

const defaults: DashboardSettings = {
  apiBaseUrl: "http://localhost:3000",
  apiKey: "",
  userId: "anonymous",
  fluffThreshold: 35,
  modelLabel: "gpt-4o-mini",
  inputPerK: 0.00015,
  outputPerK: 0.0006,
  systemPromptTemplate: DEFAULT_SYSTEM_PROMPT
};

export function SettingsPanel({ initial, onSave }: Props) {
  const [s, setS] = useState<DashboardSettings>(initial);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => setS(initial), [initial]);

  const update = <K extends keyof DashboardSettings>(
    key: K,
    value: DashboardSettings[K]
  ) => setS((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="card-title mb-0">Settings</div>
        {savedFlash && <span className="text-ok text-xs">Saved.</span>}
      </div>

      <Field label="Backend URL">
        <input
          className="input"
          value={s.apiBaseUrl}
          onChange={(e) => update("apiBaseUrl", e.target.value)}
        />
      </Field>
      <Field label="API key (Bearer)">
        <input
          className="input"
          type="password"
          value={s.apiKey}
          onChange={(e) => update("apiKey", e.target.value)}
        />
      </Field>
      <Field label="User id">
        <input
          className="input"
          value={s.userId}
          onChange={(e) => update("userId", e.target.value)}
        />
      </Field>
      <Field label={`Fluff threshold: ${s.fluffThreshold}`}>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={s.fluffThreshold}
          className="w-full accent-accent"
          onChange={(e) => update("fluffThreshold", Number(e.target.value))}
        />
      </Field>

      <details className="rounded-md border border-white/5 p-3">
        <summary className="cursor-pointer text-sm text-muted">
          Pricing &amp; system prompt
        </summary>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Field label="Model label">
              <input
                className="input"
                value={s.modelLabel}
                onChange={(e) => update("modelLabel", e.target.value)}
              />
            </Field>
            <Field label="Input $/1k">
              <input
                className="input"
                type="number"
                step="0.0001"
                value={s.inputPerK}
                onChange={(e) => update("inputPerK", Number(e.target.value))}
              />
            </Field>
            <Field label="Output $/1k">
              <input
                className="input"
                type="number"
                step="0.0001"
                value={s.outputPerK}
                onChange={(e) => update("outputPerK", Number(e.target.value))}
              />
            </Field>
          </div>
          <Field label="System prompt template">
            <textarea
              className="input min-h-[160px] font-mono text-[12.5px]"
              value={s.systemPromptTemplate}
              onChange={(e) => update("systemPromptTemplate", e.target.value)}
            />
          </Field>
        </div>
      </details>

      <div className="flex justify-end gap-2">
        <button
          className="btn"
          onClick={() => setS(defaults)}
        >
          Reset
        </button>
        <button
          className="btn-primary"
          onClick={() => {
            onSave(s);
            saveDashboardSettings(s);
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 1200);
          }}
        >
          Save
        </button>
      </div>

      <style>{`
        .input {
          width: 100%;
          background: #0f1115;
          border: 1px solid rgba(255,255,255,0.08);
          color: #f5f5f7;
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 13px;
          box-sizing: border-box;
        }
        .input:focus { outline: 1px solid #4f7cff; }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-muted mb-1">
        {label}
      </div>
      {children}
    </label>
  );
}
