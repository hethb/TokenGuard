import { Router, type Request } from "express";
import { z } from "zod";
import { optimizePrompt } from "../services/promptOptimizer.js";
import { recordOptimization } from "../services/sessionStats.js";

const Body = z.object({
  text: z.string().min(1, "text is required").max(20_000)
});

export const optimizeRouter = Router();

optimizeRouter.post("/", async (req: Request, res) => {
  const parse = Body.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() });
    return;
  }
  try {
    const result = await optimizePrompt(parse.data.text);
    await recordOptimization(
      (req as Request & { userId: string }).userId,
      result.originalTokens,
      result.optimizedTokens
    );
    res.json(result);
  } catch (e) {
    console.error("[optimize] error:", e);
    res.status(500).json({ error: "optimize failed" });
  }
});
