import { useMemo, useState } from "react";
import { ApiClient } from "./lib/api.js";
import { useSessionStats } from "./hooks/useSessionStats.js";
import { TokenDashboard } from "./components/TokenDashboard.js";
import {
  SettingsPanel,
  loadDashboardSettings,
  saveDashboardSettings,
  type DashboardSettings
} from "./components/SettingsPanel.js";
import { PromptPlayground } from "./components/PromptPlayground.js";

type Tab = "dashboard" | "playground" | "settings";

export function App() {
  const [settings, setSettings] = useState<DashboardSettings>(() =>
    loadDashboardSettings()
  );
  const [tab, setTab] = useState<Tab>("dashboard");

  const client = useMemo(
    () =>
      new ApiClient({
        baseUrl: settings.apiBaseUrl,
        apiKey: settings.apiKey || undefined,
        userId: settings.userId || undefined
      }),
    [settings.apiBaseUrl, settings.apiKey, settings.userId]
  );

  const stats = useSessionStats(client);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-white/5 bg-black/20 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">TokenGuard</h1>
          <p className="text-xs text-muted">
            Force LLM chatbots to be concise.
          </p>
        </div>
        <nav className="flex gap-1">
          <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")}>
            Dashboard
          </TabButton>
          <TabButton active={tab === "playground"} onClick={() => setTab("playground")}>
            Playground
          </TabButton>
          <TabButton active={tab === "settings"} onClick={() => setTab("settings")}>
            Settings
          </TabButton>
        </nav>
      </header>

      <main className="flex-1 px-6 py-6 max-w-6xl w-full mx-auto space-y-6">
        {stats.error && (
          <div className="card border-bad/30 bg-bad/10 text-sm">
            <strong className="text-bad">Backend unreachable.</strong>{" "}
            <span className="text-muted">{stats.error}</span> — verify the URL
            and API key in Settings.
          </div>
        )}

        {tab === "dashboard" && stats.data && (
          <TokenDashboard
            session={stats.data.session}
            daily={stats.data.daily}
            pricing={{
              modelLabel: settings.modelLabel,
              inputPerK: settings.inputPerK,
              outputPerK: settings.outputPerK
            }}
            onReset={stats.reset}
          />
        )}
        {tab === "dashboard" && !stats.data && !stats.error && (
          <div className="text-muted text-sm">Loading…</div>
        )}

        {tab === "playground" && (
          <PromptPlayground
            client={client}
            threshold={settings.fluffThreshold}
            onStatsChanged={stats.refresh}
          />
        )}

        {tab === "settings" && (
          <SettingsPanel
            initial={settings}
            onSave={(next) => {
              setSettings(next);
              saveDashboardSettings(next);
            }}
          />
        )}
      </main>

      <footer className="text-center text-xs text-muted py-6">
        TokenGuard · v0.1.0 · session id{" "}
        <code className="text-muted/80">
          {stats.data?.session.sessionId ?? "—"}
        </code>
      </footer>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm transition ${
        active
          ? "bg-accent text-white"
          : "text-muted hover:text-slate-100 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}
