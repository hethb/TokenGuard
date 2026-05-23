import type {
  FluffScoreResult,
  OptimizedPrompt,
  SessionStats
} from "@tokenguard/shared";

export interface DailyAggregate {
  day: string;
  promptRaw: number;
  promptOptimized: number;
  responseRaw: number;
  responseCleaned: number;
  saved: number;
  avgFluff: number | null;
}

export interface StatsResponse {
  session: SessionStats;
  daily: DailyAggregate[];
}

export interface ApiClientOptions {
  baseUrl: string;
  apiKey?: string;
  userId?: string;
}

export class ApiClient {
  constructor(private opts: ApiClientOptions) {}

  private headers(): HeadersInit {
    return {
      "Content-Type": "application/json",
      ...(this.opts.apiKey
        ? { Authorization: `Bearer ${this.opts.apiKey}` }
        : {}),
      ...(this.opts.userId ? { "x-user-id": this.opts.userId } : {})
    };
  }

  private url(path: string): string {
    return `${this.opts.baseUrl.replace(/\/$/, "")}${path}`;
  }

  async optimize(text: string): Promise<OptimizedPrompt> {
    const r = await fetch(this.url("/optimize-prompt"), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ text })
    });
    if (!r.ok) throw new Error(`optimize failed: ${r.status}`);
    return r.json();
  }

  async enforce(text: string): Promise<FluffScoreResult> {
    const r = await fetch(this.url("/enforce-response"), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ text })
    });
    if (!r.ok) throw new Error(`enforce failed: ${r.status}`);
    return r.json();
  }

  async stats(days = 14): Promise<StatsResponse> {
    const r = await fetch(this.url(`/session-stats?days=${days}`), {
      headers: this.headers()
    });
    if (!r.ok) throw new Error(`stats failed: ${r.status}`);
    return r.json();
  }

  async resetSession(): Promise<SessionStats> {
    const r = await fetch(this.url("/session-stats/reset"), {
      method: "POST",
      headers: this.headers()
    });
    if (!r.ok) throw new Error(`reset failed: ${r.status}`);
    return r.json();
  }
}
