import {
  DEFAULT_PRICING,
  DEFAULT_SYSTEM_PROMPT,
  type TokenGuardSettings
} from "@tokenguard/shared";

const SETTINGS_KEY = "tokenguard.settings";

export const DEFAULT_SETTINGS: TokenGuardSettings = {
  enabled: true,
  enforceSystemPrompt: true,
  systemPromptTemplate: DEFAULT_SYSTEM_PROMPT,
  optimizePrompt: true,
  fluffThreshold: 35,
  showDiffOverlay: true,
  // Empty string ⇒ run fully local with no backend dependency. Users who
  // want LLM-powered prompt rewrites or cross-device history can point this
  // at a self-hosted (or hosted) backend in the options page.
  apiBaseUrl: "",
  apiKey: undefined,
  pricing: DEFAULT_PRICING
};

function getStorage(): chrome.storage.StorageArea {
  // Prefer sync storage so prefs follow users across machines, but the
  // (rare) cases without sync support fall back to local.
  return chrome.storage?.sync ?? chrome.storage.local;
}

export async function loadSettings(): Promise<TokenGuardSettings> {
  return new Promise((resolve) => {
    getStorage().get([SETTINGS_KEY], (record) => {
      const stored = (record?.[SETTINGS_KEY] as Partial<TokenGuardSettings>) ?? {};
      resolve({ ...DEFAULT_SETTINGS, ...stored });
    });
  });
}

export async function saveSettings(
  patch: Partial<TokenGuardSettings>
): Promise<TokenGuardSettings> {
  const current = await loadSettings();
  const merged: TokenGuardSettings = { ...current, ...patch };
  return new Promise((resolve) => {
    getStorage().set({ [SETTINGS_KEY]: merged }, () => resolve(merged));
  });
}

export function watchSettings(
  cb: (s: TokenGuardSettings) => void
): () => void {
  const handler = (
    changes: { [key: string]: chrome.storage.StorageChange },
    area: string
  ) => {
    if (area !== "sync" && area !== "local") return;
    const change = changes[SETTINGS_KEY];
    if (!change) return;
    const merged: TokenGuardSettings = {
      ...DEFAULT_SETTINGS,
      ...(change.newValue as Partial<TokenGuardSettings> | undefined)
    };
    cb(merged);
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
