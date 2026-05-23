import "dotenv/config";

export interface Config {
  port: number;
  nodeEnv: string;
  openaiApiKey?: string;
  openaiModel: string;
  redisUrl?: string;
  databaseUrl?: string;
  apiKey?: string;
  corsOrigins: string[];
}

export const config: Config = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  openaiApiKey: process.env.OPENAI_API_KEY || undefined,
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  redisUrl: process.env.REDIS_URL || undefined,
  databaseUrl: process.env.DATABASE_URL || undefined,
  apiKey: process.env.TOKENGUARD_API_KEY || undefined,
  corsOrigins: (process.env.CORS_ORIGINS ?? "chrome-extension://*,http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
};
