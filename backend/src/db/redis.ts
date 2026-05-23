import Redis from "ioredis";
import { config } from "../config.js";

export interface KvStore {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  incr(key: string, by?: number): Promise<number>;
  hset(key: string, values: Record<string, number>): Promise<void>;
  hgetall(key: string): Promise<Record<string, string>>;
  expire(key: string, ttlSeconds: number): Promise<void>;
}

export class InMemoryStore implements KvStore {
  private data = new Map<string, { value: unknown; expiresAt?: number }>();
  private hashes = new Map<string, Map<string, string>>();

  private valid(key: string): boolean {
    const entry = this.data.get(key);
    if (!entry) return false;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.data.delete(key);
      return false;
    }
    return true;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.valid(key) ? (this.data.get(key)!.value as T) : null;
  }
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.data.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined
    });
  }
  async incr(key: string, by = 1): Promise<number> {
    const current = (await this.get<number>(key)) ?? 0;
    const next = current + by;
    await this.set(key, next);
    return next;
  }
  async hset(key: string, values: Record<string, number>): Promise<void> {
    let h = this.hashes.get(key);
    if (!h) {
      h = new Map();
      this.hashes.set(key, h);
    }
    for (const [k, v] of Object.entries(values)) {
      h.set(k, String((Number(h.get(k) ?? 0) || 0) + v));
    }
  }
  async hgetall(key: string): Promise<Record<string, string>> {
    const h = this.hashes.get(key);
    if (!h) return {};
    return Object.fromEntries(h.entries());
  }
  async expire(_key: string, _ttlSeconds: number): Promise<void> {
    // best-effort no-op for in-memory backend
  }
}

class RedisStore implements KvStore {
  constructor(private redis: Redis) {}
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.set(key, serialized, "EX", ttlSeconds);
    } else {
      await this.redis.set(key, serialized);
    }
  }
  async incr(key: string, by = 1): Promise<number> {
    return this.redis.incrby(key, by);
  }
  async hset(key: string, values: Record<string, number>): Promise<void> {
    const pipeline = this.redis.pipeline();
    for (const [k, v] of Object.entries(values)) {
      pipeline.hincrby(key, k, v);
    }
    await pipeline.exec();
  }
  async hgetall(key: string): Promise<Record<string, string>> {
    return this.redis.hgetall(key);
  }
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.redis.expire(key, ttlSeconds);
  }
}

let store: KvStore | null = null;

export function getKvStore(): KvStore {
  if (store) return store;
  if (config.redisUrl) {
    const redis = new Redis(config.redisUrl, { lazyConnect: true });
    redis.connect().catch((err) => {
      console.warn(
        "[TokenGuard] redis connect failed, using in-memory store:",
        err
      );
    });
    store = new RedisStore(redis);
  } else {
    store = new InMemoryStore();
  }
  return store;
}
