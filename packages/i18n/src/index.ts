import i18next, { type i18n as I18n } from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "./resources";

/** Language used whenever the user has not explicitly chosen English. */
export const DEFAULT_LANGUAGE = "zh-CN";
/** Language used when a translation key is missing. */
export const FALLBACK_LANGUAGE = "en";

/**
 * Pure language resolution: Chinese is the default; English is used only when
 * explicitly stored in settings.
 */
export function resolveLanguage(stored: string | null | undefined): string {
  return stored === "en" ? "en" : DEFAULT_LANGUAGE;
}

let initialized = false;

/** Initializes i18next exactly once. Safe to call from any entrypoint. */
export function initI18n(storedLanguage?: string | null): I18n {
  if (!initialized) {
    void i18next.use(initReactI18next).init({
      resources,
      lng: resolveLanguage(storedLanguage),
      fallbackLng: FALLBACK_LANGUAGE,
      interpolation: { escapeValue: false },
      returnEmptyString: false,
    });
    initialized = true;
  }
  return i18next;
}

/** The shared i18next instance, usable outside React (e.g. plain functions). */
export const i18n = i18next;
