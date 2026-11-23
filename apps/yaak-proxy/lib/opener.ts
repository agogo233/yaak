import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import { i18n } from "@yaakapp-internal/i18n";

/** Says what failed, as a toast, rather than leaving a button that does nothing */
export type ReportFailure = (message: string) => void;

/** Shows a file or folder in the platform's file manager */
export async function revealPath(path: string, report: ReportFailure): Promise<void> {
  try {
    await revealItemInDir(path);
  } catch (err) {
    report(i18n.t("flows.failedReveal", { path, error: String(err) }));
  }
}

/** Opens a link in the default browser */
export async function openLink(url: string, report: ReportFailure): Promise<void> {
  try {
    await openUrl(url);
  } catch (err) {
    report(i18n.t("flows.failedOpen", { url, error: String(err) }));
  }
}

/** What the platform calls showing a file in its file manager */
export function revealLabel(os: string): string {
  if (os === "macos") return i18n.t("common.revealInFinder");
  if (os === "windows") return i18n.t("common.showInExplorer");
  return i18n.t("common.showInFileManager");
}
