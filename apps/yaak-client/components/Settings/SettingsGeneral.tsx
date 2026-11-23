import { patchModel, settingsAtom } from "@yaakapp-internal/models";
import { Heading, VStack } from "@yaakapp-internal/ui";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { useCheckForUpdates } from "../../hooks/useCheckForUpdates";
import { appInfo } from "../../lib/appInfo";
import { revealInFinderText } from "../../lib/reveal";
import { CargoFeature } from "../CargoFeature";
import { CommercialUseBanner } from "../CommercialUseBanner";
import { DismissibleBanner } from "../core/DismissibleBanner";
import { IconButton } from "../core/IconButton";
import { platform } from "@yaakapp-internal/platform";
import {
  ModelSettingRowBoolean,
  ModelSettingSelectControl,
  SettingValue,
  SettingRow,
  SettingRowBoolean,
  SettingRowSelect,
  SettingsList,
  SettingsSection,
} from "../core/SettingRow";

const WORKSPACE_SETTINGS_MOVED_AT = "2026-06-30";

export function SettingsGeneral() {
  const settings = useAtomValue(settingsAtom);
  const checkForUpdates = useCheckForUpdates();
  const { t } = useTranslation();

  if (settings == null) {
    return null;
  }

  const showWorkspaceSettingsMovedBanner =
    settings.createdAt.slice(0, 10) < WORKSPACE_SETTINGS_MOVED_AT;

  return (
    <VStack space={1.5} className="mb-4">
      <div>
        <Heading>{t("settings.general")}</Heading>
        <p className="text-text-subtle">
          {t("settings.generalDesc")}
        </p>
      </div>
      <div className="mt-3 mb-5">
        <CommercialUseBanner source="settings-general" title={t("settings.usingForWork")} />
      </div>
      <SettingsList className="space-y-8">
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

        <CargoFeature feature="updater">
          <SettingsSection title={t("settings.updates")}>
            <SettingRow
              title={t("settings.updateChannel")}
              description={t("settings.updateChannelDesc")}
            >
              <div className="grid grid-cols-[12rem_auto] gap-1">
                <ModelSettingSelectControl
                  model={settings}
                  modelKey="updateChannel"
                  label={t("settings.updateChannel")}
                  selectClassName="w-full!"
                  options={[
                    { label: t("settings.stable"), value: "stable" },
                    { label: t("settings.beta"), value: "beta" },
                  ]}
                />
                <IconButton
                  variant="border"
                  size="sm"
                  title={t("settings.checkForUpdates")}
                  icon="refresh"
                  spin={checkForUpdates.isPending}
                  onClick={() => checkForUpdates.mutateAsync()}
                />
              </div>
            </SettingRow>

            <SettingRowSelect
              title={t("settings.updateBehavior")}
              description={t("settings.updateBehaviorDesc")}
              name="autoupdate"
              value={settings.autoupdate ? "auto" : "manual"}
              onChange={(v) =>
                patchModel(settings, { autoupdate: v === "auto" })
              }
              options={[
                { label: t("settings.automatic"), value: "auto" },
                { label: t("settings.manual"), value: "manual" },
              ]}
            />

            <ModelSettingRowBoolean
              model={settings}
              modelKey="autoDownloadUpdates"
              title={t("settings.autoDownload")}
              description={t("settings.autoDownloadDesc")}
              disabled={!settings.autoupdate}
            />

            <ModelSettingRowBoolean
              model={settings}
              modelKey="checkNotifications"
              title={t("settings.checkNotifications")}
              description={t("settings.checkNotificationsDesc")}
            />

            <SettingRowBoolean
              title={t("settings.anonymousStats")}
              description={t("settings.anonymousStatsDesc")}
              disabled
              checked={false}
              onChange={() => {}}
            />
          </SettingsSection>
        </CargoFeature>

        <CargoFeature feature="license">
          <SettingsSection title={t("settings.feedback")}>
            <SettingRowBoolean
              title={t("settings.promptFeedback")}
              description={t("settings.promptFeedbackDesc")}
              checked={settings.promptFeedback}
              onChange={(promptFeedback) => patchModel(settings, { promptFeedback })}
            />
          </SettingsSection>
        </CargoFeature>

        {showWorkspaceSettingsMovedBanner && (
          <DismissibleBanner
            id="workspace-settings-moved-2026-06-30"
            color="info"
            className="w-full p-4 max-w-xl mr-auto"
          >
            <p>
              Workspace specific settings have moved to{" "}
              <b>Workspace Settings</b>, accessible from the workspace switcher
              menu.
            </p>
          </DismissibleBanner>
        )}

        <SettingsSection title={t("settings.appInfo")}>
          <SettingRow title={t("settings.version")} description={t("settings.versionDesc")}>
            <SettingValue value={appInfo.version} />
          </SettingRow>
          <SettingRow
            title={t("settings.dataDirectory")}
            description={t("settings.dataDirectoryDesc")}
            controlClassName="min-w-0 max-w-[min(42rem,55vw)] gap-2"
          >
            <SettingValue
              value={appInfo.appDataDir}
              actions={[
                {
                  title: revealInFinderText,
                  icon: "folder_open",
                  onClick: () => platform.revealItemInDir(appInfo.appDataDir),
                },
              ]}
            />
          </SettingRow>
          <SettingRow
            title={t("settings.logsDirectory")}
            description={t("settings.logsDirectoryDesc")}
            controlClassName="min-w-0 max-w-[min(42rem,55vw)] gap-2"
          >
            <SettingValue
              value={appInfo.appLogDir}
              actions={[
                {
                  title: revealInFinderText,
                  icon: "folder_open",
                  onClick: () => platform.revealItemInDir(appInfo.appLogDir),
                },
              ]}
            />
          </SettingRow>
        </SettingsSection>
      </SettingsList>
    </VStack>
  );
}
