import type { ModelPayload, Settings } from "@yaakapp-internal/models";
import { platform } from "@yaakapp-internal/platform";
import { i18n, initI18n, resolveLanguage } from "@yaakapp-internal/i18n";
import { getSettings } from "../lib/settings";

function applyLanguage(settings: Settings) {
  const language = resolveLanguage(settings.language);
  if (i18n.language !== language) void i18n.changeLanguage(language);
  document.documentElement.lang = language;
}

// Initialize translations from stored settings, then keep them in sync.
// Awaiting here guarantees the first paint already uses the right language.
export async function initI18nWatcher() {
  const settings = await getSettings().catch(() => null);
  initI18n(settings?.language ?? null);
  if (settings != null) applyLanguage(settings);

  platform.listen<ModelPayload[]>("model_writes", (payloads) => {
    for (const payload of payloads) {
      if (payload.change.type !== "upsert") continue;
      if (payload.model.model !== "settings") continue;
      applyLanguage(payload.model);
    }
  });
}
