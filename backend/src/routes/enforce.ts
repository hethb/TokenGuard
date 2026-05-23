import { Router, type Request } from "express";
import { z } from "zod";
import { countTokens } from "@tokenguard/shared";
import { enforceResponse } from "../services/fluffDetector.js";
import { recordEnforcement } from "../services/sessionStats.js";

const Body = z.object({
  text: z.string().min(1).max(60_000)
});

export const enforceRouter = Router();

enforceRouter.post("/", async (req: Request, res) => {
  const parse = Body.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() });
    return;
  }
  try {
    const result = await enforceResponse(parse.data.text);
    const before = countTokens(parse.data.text);
    const after = countTokens(result.cleanedText);
    await recordEnforcement(
      (req as Request & { userId: string }).userId,
      before,
      after,
      result.score
    );
    res.json(result);
  } catch (e) {
    console.error("[enforce] error:", e);
    res.status(500).json({ error: "enforce failed" });
  }
});
