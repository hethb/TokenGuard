import { startInjector } from "./injectorCore.js";
import { claudePlatform } from "./chatPlatform.js";

void startInjector(claudePlatform).catch((err) => {
  console.error("[TokenGuard] Claude injector failed:", err);
});
