import pg from "pg";
import { config } from "../config.js";

const { Pool } = pg;

export interface HistoryRow {
  id?: number;
  user_id: string;
  ts: Date;
  prompt_tokens_raw: number;
  prompt_tokens_optimized: number;
  response_tokens_raw: number;
  response_tokens_cleaned: number;
  fluff_score: number | null;
}

export interface HistoryStore {
  appendOptimization(row: Omit<HistoryRow, "id" | "ts">): Promise<void>;
  appendEnforcement(row: Omit<HistoryRow, "id" | "ts">): Promise<void>;
  daily(userId: string, days: number): Promise<DailyAggregate[]>;
}

export interface DailyAggregate {
  day: string;
  promptRaw: number;
  promptOptimized: number;
  responseRaw: number;
  responseCleaned: number;
  saved: number;
  avgFluff: number | null;
}

class InMemoryHistory implements HistoryStore {
  private rows: HistoryRow[] = [];
  async appendOptimization(row: Omit<HistoryRow, "id" | "ts">): Promise<void> {
    this.rows.push({ ...row, ts: new Date() });
  }
  async appendEnforcement(row: Omit<HistoryRow, "id" | "ts">): Promise<void> {
    this.rows.push({ ...row, ts: new Date() });
  }
  async daily(userId: string, days: number): Promise<DailyAggregate[]> {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const filtered = this.rows.filter(
      (r) => r.user_id === userId && r.ts.getTime() >= cutoff
    );
    const buckets = new Map<string, DailyAggregate>();
    for (const r of filtered) {
      const day = r.ts.toISOString().slice(0, 10);
      const cur =
        buckets.get(day) ??
        ({
          day,
          promptRaw: 0,
          promptOptimized: 0,
          responseRaw: 0,
          responseCleaned: 0,
          saved: 0,
          avgFluff: null
        } as DailyAggregate);
      cur.promptRaw += r.prompt_tokens_raw;
      cur.promptOptimized += r.prompt_tokens_optimized;
      cur.responseRaw += r.response_tokens_raw;
      cur.responseCleaned += r.response_tokens_cleaned;
      cur.saved =
        Math.max(0, cur.promptRaw - cur.promptOptimized) +
        Math.max(0, cur.responseRaw - cur.responseCleaned);
      if (r.fluff_score != null) {
        cur.avgFluff =
          cur.avgFluff == null
            ? r.fluff_score
            : (cur.avgFluff + r.fluff_score) / 2;
      }
      buckets.set(day, cur);
    }
    return Array.from(buckets.values()).sort((a, b) =>
      a.day.localeCompare(b.day)
    );
  }
}

class PgHistory implements HistoryStore {
  constructor(private pool: pg.Pool) {}
  static SCHEMA = `
    create table if not exists tokenguard_history (
      id bigserial primary key,
      user_id text not null,
      ts timestamptz not null default now(),
      prompt_tokens_raw int not null default 0,
      prompt_tokens_optimized int not null default 0,
      response_tokens_raw int not null default 0,
      response_tokens_cleaned int not null default 0,
      fluff_score smallint
    );
    create index if not exists tg_history_user_ts on tokenguard_history (user_id, ts desc);
  `;

  async ensure(): Promise<void> {
    await this.pool.query(PgHistory.SCHEMA);
  }
  async appendOptimization(
    row: Omit<HistoryRow, "id" | "ts">
  ): Promise<void> {
    await this.pool.query(
      `insert into tokenguard_history (user_id, prompt_tokens_raw, prompt_tokens_optimized, response_tokens_raw, response_tokens_cleaned, fluff_score)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        row.user_id,
        row.prompt_tokens_raw,
        row.prompt_tokens_optimized,
        row.response_tokens_raw,
        row.response_tokens_cleaned,
        row.fluff_score
      ]
    );
  }
  async appendEnforcement(row: Omit<HistoryRow, "id" | "ts">): Promise<void> {
    return this.appendOptimization(row);
  }
  async daily(userId: string, days: number): Promise<DailyAggregate[]> {
    const res = await this.pool.query(
      `select to_char(ts, 'YYYY-MM-DD') as day,
              sum(prompt_tokens_raw)::int as prompt_raw,
              sum(prompt_tokens_optimized)::int as prompt_optimized,
              sum(response_tokens_raw)::int as response_raw,
              sum(response_tokens_cleaned)::int as response_cleaned,
              avg(fluff_score)::float as avg_fluff
         from tokenguard_history
        where user_id = $1 and ts > now() - ($2 || ' days')::interval
        group by 1 order by 1 asc`,
      [userId, days]
    );
    return res.rows.map((r) => {
      const promptRaw = Number(r.prompt_raw);
      const promptOptimized = Number(r.prompt_optimized);
      const responseRaw = Number(r.response_raw);
      const responseCleaned = Number(r.response_cleaned);
      return {
        day: r.day,
        promptRaw,
        promptOptimized,
        responseRaw,
        responseCleaned,
        saved:
          Math.max(0, promptRaw - promptOptimized) +
          Math.max(0, responseRaw - responseCleaned),
        avgFluff: r.avg_fluff == null ? null : Number(r.avg_fluff)
      };
    });
  }
}

let history: HistoryStore | null = null;

export async function getHistoryStore(): Promise<HistoryStore> {
  if (history) return history;
  if (config.databaseUrl) {
    try {
      const pool = new Pool({ connectionString: config.databaseUrl });
      const pg = new PgHistory(pool);
      await pg.ensure();
      history = pg;
    } catch (e) {
      console.warn(
        "[TokenGuard] postgres init failed, using in-memory history:",
        e
      );
      history = new InMemoryHistory();
    }
  } else {
    history = new InMemoryHistory();
  }
  return history;
}
