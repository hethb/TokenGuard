import type { TokenGuardSettings } from "@tokenguard/shared";
import { sendMessage } from "../shared/messages.js";

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;

async function load() {
  const s = (await sendMessage({
    type: "GET_SETTINGS"
  })) as TokenGuardSettings;
  ($("enabled") as HTMLInputElement).checked = s.enabled;
  ($("optimizePrompt") as HTMLInputElement).checked = s.optimizePrompt;
  ($("showDiffOverlay") as HTMLInputElement).checked = s.showDiffOverlay;
  ($("enforceSystemPrompt") as HTMLInputElement).checked = s.enforceSystemPrompt;
  ($("fluffThreshold") as HTMLInputElement).value = String(s.fluffThreshold);
  ($("fluffThresholdRange") as HTMLInputElement).value = String(s.fluffThreshold);
  ($("systemPromptTemplate") as HTMLTextAreaElement).value =
    s.systemPromptTemplate;
  ($("apiBaseUrl") as HTMLInputElement).value = s.apiBaseUrl;
  ($("apiKey") as HTMLInputElement).value = s.apiKey ?? "";
  ($("modelLabel") as HTMLInputElement).value = s.pricing.modelLabel;
  ($("inputPerK") as HTMLInputElement).value = String(s.pricing.inputPerK);
  ($("outputPerK") as HTMLInputElement).value = String(s.pricing.outputPerK);
}

function syncRangeAndNumber() {
  const range = $("fluffThresholdRange") as HTMLInputElement;
  const num = $("fluffThreshold") as HTMLInputElement;
  range.addEventListener("input", () => (num.value = range.value));
  num.addEventListener("input", () => (range.value = num.value));
}

async function save() {
  const patch: Partial<TokenGuardSettings> = {
    enabled: ($("enabled") as HTMLInputElement).checked,
    optimizePrompt: ($("optimizePrompt") as HTMLInputElement).checked,
    showDiffOverlay: ($("showDiffOverlay") as HTMLInputElement).checked,
    enforceSystemPrompt: ($("enforceSystemPrompt") as HTMLInputElement).checked,
    fluffThreshold: Number(($("fluffThreshold") as HTMLInputElement).value),
    systemPromptTemplate: ($("systemPromptTemplate") as HTMLTextAreaElement).value,
    apiBaseUrl: ($("apiBaseUrl") as HTMLInputElement).value,
    apiKey: ($("apiKey") as HTMLInputElement).value || undefined,
    pricing: {
      modelLabel: ($("modelLabel") as HTMLInputElement).value,
      inputPerK: Number(($("inputPerK") as HTMLInputElement).value),
      outputPerK: Number(($("outputPerK") as HTMLInputElement).value)
    }
  };
  await sendMessage({ type: "UPDATE_SETTINGS", payload: patch });
  const saved = $("saved");
  saved.classList.add("shown");
  setTimeout(() => saved.classList.remove("shown"), 1200);
}

syncRangeAndNumber();
$("save").addEventListener("click", () => void save());
void load();
