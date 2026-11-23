import { patchModel, settingsAtom } from "@yaakapp-internal/models";
import { SettingsGeneral as SharedSettingsGeneral } from "@yaakapp-internal/ui";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { useSettingsView } from "../../hooks/useSettingsView";
import { CommercialUseBanner } from "../CommercialUseBanner";
import { DismissibleBanner } from "../core/DismissibleBanner";
import { SettingRowSelect } from "../core/SettingRow";

const WORKSPACE_SETTINGS_MOVED_AT = "2026-06-30";

export function SettingsGeneral() {
  const settings = useAtomValue(settingsAtom);
  const bound = useSettingsView();
  const { t } = useTranslation();

  if (settings == null || bound == null) {
    return null;
  }

  const showWorkspaceSettingsMovedBanner =
    settings.createdAt.slice(0, 10) < WORKSPACE_SETTINGS_MOVED_AT;

  return (
    <SharedSettingsGeneral
      view={bound.view}
      callbacks={bound.callbacks}
      banner={<CommercialUseBanner source="settings-general" title={t("settings.usingForWork")} />}
      extraSections={
        <>
          <div className="max-w-xl mr-auto">
            <SettingRowSelect
              title={t("settings.language")}
              description={t("settings.languageDesc")}
              name="language"
              value={settings.language === "en" ? "en" : "zh-CN"}
              onChange={(v) => patchModel(settings, { language: v === "zh-CN" ? null : v })}
              options={[
                { label: "简体中文", value: "zh-CN" },
                { label: "English", value: "en" },
              ]}
            />
          </div>
          {showWorkspaceSettingsMovedBanner && (
            <DismissibleBanner
              id="workspace-settings-moved-2026-06-30"
              color="info"
              className="w-full p-4 max-w-xl mr-auto"
            >
              <p>{t("settings.workspaceMoved")}</p>
            </DismissibleBanner>
          )}
        </>
      }
    />
  );
}
