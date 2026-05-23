import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { estimateCost, type SessionStats } from "@tokenguard/shared";
import type { DailyAggregate } from "../lib/api.js";

interface Props {
  session: SessionStats;
  daily: DailyAggregate[];
  pricing: { inputPerK: number; outputPerK: number; modelLabel: string };
  onReset: () => void;
}

export function TokenDashboard({ session, daily, pricing, onReset }: Props) {
  const totalSession =
    session.promptTokensOptimized + session.responseTokensCleaned;
  const sessionSaved =
    Math.max(0, session.promptTokensRaw - session.promptTokensOptimized) +
    Math.max(0, session.responseTokensRaw - session.responseTokensCleaned);
  const sessionCost = estimateCost(
    session.promptTokensOptimized,
    session.responseTokensCleaned,
    pricing
  ).totalUsd;
  const wouldHaveCost = estimateCost(
    session.promptTokensRaw,
    session.responseTokensRaw,
    pricing
  ).totalUsd;
  const savedUsd = Math.max(0, wouldHaveCost - sessionCost);

  const totalSavedAllTime = daily.reduce((acc, d) => acc + d.saved, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Stat label="Session tokens" value={totalSession.toLocaleString()} />
        <Stat
          label="Saved this session"
          value={sessionSaved.toLocaleString()}
          tone="ok"
        />
        <Stat
          label="Session cost"
          value={`$${sessionCost.toFixed(4)}`}
          sub={`vs $${wouldHaveCost.toFixed(4)} raw`}
        />
        <Stat
          label="USD saved"
          value={`$${savedUsd.toFixed(4)}`}
          tone="ok"
        />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="card-title mb-0">Token efficiency</div>
            <div className="text-xs text-muted mt-1">
              Pricing: {pricing.modelLabel} · ${pricing.inputPerK.toFixed(4)}/k
              in · ${pricing.outputPerK.toFixed(4)}/k out
            </div>
          </div>
          <button className="btn" onClick={onReset}>
            Reset session
          </button>
        </div>

        {daily.length === 0 ? (
          <div className="text-muted text-sm py-12 text-center">
            No history yet. Talk to a chatbot with TokenGuard enabled to start
            collecting data.
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart
                data={daily}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="raw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fda4a4" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#fda4a4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="kept" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f7cff" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#4f7cff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="saved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6ee7a3" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#6ee7a3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#9aa3b2", fontSize: 11 }}
                  stroke="rgba(255,255,255,0.05)"
                />
                <YAxis
                  tick={{ fill: "#9aa3b2", fontSize: 11 }}
                  stroke="rgba(255,255,255,0.05)"
                />
                <Tooltip
                  contentStyle={{
                    background: "#161a21",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    color: "#f5f5f7"
                  }}
                />
                <Legend wrapperStyle={{ color: "#cbd1da" }} />
                <Area
                  type="monotone"
                  dataKey="responseRaw"
                  name="Raw response tokens"
                  stroke="#fda4a4"
                  fill="url(#raw)"
                />
                <Area
                  type="monotone"
                  dataKey="responseCleaned"
                  name="After TokenGuard"
                  stroke="#4f7cff"
                  fill="url(#kept)"
                />
                <Area
                  type="monotone"
                  dataKey="saved"
                  name="Saved"
                  stroke="#6ee7a3"
                  fill="url(#saved)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="text-xs text-muted mt-3">
          Lifetime saved across this window: {totalSavedAllTime.toLocaleString()} tokens
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ok" | "bad" | "warn";
}) {
  const toneClass =
    tone === "ok"
      ? "text-ok"
      : tone === "bad"
        ? "text-bad"
        : tone === "warn"
          ? "text-warn"
          : "text-slate-100";
  return (
    <div className="card">
      <div className="card-title">{label}</div>
      <div className={`stat-num ${toneClass}`}>{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}
