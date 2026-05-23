import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { authenticate } from "./middleware/auth.js";
import { optimizeRouter } from "./routes/optimize.js";
import { enforceRouter } from "./routes/enforce.js";
import { statsRouter } from "./routes/stats.js";

export function createApp() {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        const allowed = config.corsOrigins.some((pattern) => {
          if (pattern === "*") return true;
          if (pattern.endsWith("/*")) {
            const prefix = pattern.slice(0, -1);
            return origin.startsWith(prefix);
          }
          return origin === pattern;
        });
        cb(allowed ? null : new Error("origin not allowed"), allowed);
      }
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.use(
    "/optimize-prompt",
    rateLimit({ windowMs: 60_000, max: 120 }),
    authenticate,
    optimizeRouter
  );
  app.use(
    "/enforce-response",
    rateLimit({ windowMs: 60_000, max: 240 }),
    authenticate,
    enforceRouter
  );
  app.use("/session-stats", authenticate, statsRouter);

  app.get("/healthz", (_req, res) => res.json({ ok: true }));
  app.get("/", (_req, res) =>
    res.json({
      name: "tokenguard-backend",
      version: "0.1.0",
      endpoints: [
        "POST /optimize-prompt",
        "POST /enforce-response",
        "GET /session-stats",
        "POST /session-stats/reset"
      ]
    })
  );

  return app;
}
