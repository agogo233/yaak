import { i18n } from "@yaakapp-internal/i18n";
import type { ProxyLock } from "@yaakapp-internal/proxy-lib";

/** What every refused read starts with, before its reason */
const LOCKED_PREFIX = "Traffic is locked: ";

/** Where each platform keeps the key, by the name its users know it by */
function keyStoreName(os: string): string {
  switch (os) {
    case "macos":
      return i18n.t("flows.keychainStore");
    case "windows":
      return i18n.t("flows.credentialStore");
    default:
      return i18n.t("flows.keyringStore");
  }
}

/**
 * The locked state's one line: how to let Yaak Proxy read its key when the key store is what
 * refused, or else the reason itself, without the "Traffic is locked" its title already says.
 */
export function lockedLine(lock: ProxyLock, os: string): string {
  if (lock.keychain) {
    return i18n.t("flows.allowKeyInStore", { store: keyStoreName(os) });
  }
  const reason = lock.message.startsWith(LOCKED_PREFIX)
    ? lock.message.slice(LOCKED_PREFIX.length)
    : lock.message;
  return reason.charAt(0).toUpperCase() + reason.slice(1);
}
