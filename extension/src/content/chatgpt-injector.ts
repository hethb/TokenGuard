import { startInjector } from "./injectorCore.js";
import { chatgptPlatform } from "./chatPlatform.js";

void startInjector(chatgptPlatform).catch((err) => {
  console.error("[TokenGuard] ChatGPT injector failed:", err);
});
