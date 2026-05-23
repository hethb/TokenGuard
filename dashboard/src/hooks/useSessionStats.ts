import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiClient, StatsResponse } from "../lib/api.js";

export interface UseSessionStatsResult {
  data: StatsResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  reset: () => Promise<void>;
  setDays: (n: number) => void;
  days: number;
}

/**
 * Polls `/session-stats` on a slow cadence and exposes a manual refresh
 * for components that just took an action that should change the totals.
 */
export function useSessionStats(
  client: ApiClient,
  initialDays = 14,
  pollMs = 15_000
): UseSessionStatsResult {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(initialDays);
  const cancelled = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await client.stats(days);
      if (!cancelled.current) setData(next);
    } catch (e) {
      if (!cancelled.current) setError((e as Error).message);
    } finally {
      if (!cancelled.current) setLoading(false);
    }
  }, [client, days]);

  const reset = useCallback(async () => {
    await client.resetSession();
    await refresh();
  }, [client, refresh]);

  useEffect(() => {
    cancelled.current = false;
    void refresh();
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => {
      cancelled.current = true;
      window.clearInterval(id);
    };
  }, [refresh, pollMs]);

  return { data, loading, error, refresh, reset, days, setDays };
}
