import { Router, type Request } from "express";
import { getSession, resetSession } from "../services/sessionStats.js";
import { getHistoryStore } from "../db/postgres.js";

export const statsRouter = Router();

statsRouter.get("/", async (req: Request, res) => {
  const userId = (req as Request & { userId: string }).userId;
  const days = Math.min(90, Math.max(1, Number(req.query.days ?? 14)));
  const session = await getSession(userId);
  const history = await getHistoryStore();
  const daily = await history.daily(userId, days);
  res.json({ session, daily });
});

statsRouter.post("/reset", async (req: Request, res) => {
  const userId = (req as Request & { userId: string }).userId;
  const fresh = await resetSession(userId);
  res.json(fresh);
});
