import {
  countTokens,
  estimateCost,
  type SessionStats,
  type TokenGuardSettings
} from "@tokenguard/shared";
import { sendMessage } from "../shared/messages.js";
import { installTiktokenCounter } from "../shared/tiktokenCounter.js";

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;

async function init() {
  // Try to upgrade to tiktoken; fall back to heuristic silently.
  let engine: "tiktoken" | "heuristic" = "heuristic";
  try {
    await installTiktokenCounter();
    engine = "tiktoken";
  } catch {
    engine = "heuristic";
  }
  $("counter-engine").textContent = engine;

  const settings = (await sendMessage({
    type: "GET_SETTINGS"
  })) as TokenGuardSettings;
  await refreshStats(settings.pricing);

  $<HTMLButtonElement>("reset").addEventListener("click", async () => {
    await sendMessage({ type: "RESET_SESSION" });
    await refreshStats(settings.pricing);
  });

  $<HTMLButtonElement>("open-options").addEventListener("click", () => {
    chrome.runtime.openOptionsPage?.();
    window.close();
  });

  const input = $<HTMLTextAreaElement>("live-input");
  const update = () => {
    const tokens = countTokens(input.value);
    $("live-tokens").textContent = tokens.toLocaleString();
    const cost = estimateCost(tokens, 0, settings.pricing).inputUsd;
    $("live-cost").textContent = `~ $${cost.toFixed(4)} input`;
  };
  input.addEventListener("input", update);
  update();
}

async function refreshStats(pricing: TokenGuardSettings["pricing"]) {
  const stats = (await sendMessage({
    type: "GET_SESSION_STATS"
  })) as SessionStats;
  const total = stats.promptTokensOptimized + stats.responseTokensCleaned;
  const saved =
    Math.max(0, stats.promptTokensRaw - stats.promptTokensOptimized) +
    Math.max(0, stats.responseTokensRaw - stats.responseTokensCleaned);
  $("stat-total").textContent = total.toLocaleString();
  $("stat-saved").textContent = saved.toLocaleString();
  const cost = estimateCost(
    stats.promptTokensOptimized,
    stats.responseTokensCleaned,
    pricing
  ).totalUsd;
  $("stat-cost").textContent = `$${cost.toFixed(4)}`;
  $(
    "stat-counts"
  ).textContent = `${stats.optimizations.toLocaleString()} · ${stats.enforcements.toLocaleString()}`;
}

void init();
