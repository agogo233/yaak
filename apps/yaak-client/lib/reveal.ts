import { i18n } from "@yaakapp-internal/i18n";
import { platform } from "@yaakapp-internal/platform";

const os = platform.osType();
export function revealInFinderText(): string {
  if (os === "macos") return i18n.t("common.revealInFinder");
  if (os === "windows") return i18n.t("common.showInExplorer");
  return i18n.t("common.showInFileManager");
}
