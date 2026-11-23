import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { IconButton } from "../IconButton";
import {
  SettingRow,
  SettingRowBoolean,
  SettingRowSelect,
  SettingSelectControl,
  SettingsList,
  SettingsSection,
  SettingValue,
} from "./SettingRow";
import { SettingsPage } from "./SettingsPage";
import type { SettingsCallbacks, SettingsView } from "./types";

export interface SettingsGeneralProps {
  view: SettingsView;
  callbacks: SettingsCallbacks;
  /** Shown under the heading, like the client's commercial-use banner */
  banner?: ReactNode;
  /** Sections only this app has, shown before App Info */
  extraSections?: ReactNode;
}

export function SettingsGeneral({ view, callbacks, banner, extraSections }: SettingsGeneralProps) {
  const { t } = useTranslation();
  const { app, values } = view;
  return (
    <SettingsPage
      title={t("settings.general")}
      description={t("settings.generalDesc")}
      banner={banner}
    >
      <SettingsList className="space-y-8">
        {view.updates != null && <SettingsUpdatesSection view={view} callbacks={callbacks} />}

        {view.feedbackPrompts && (
          <SettingsSection title={t("settings.feedback")}>
            <SettingRowBoolean
              title={t("settings.promptFeedback")}
              description={t("settings.promptFeedbackDesc")}
              checked={values.promptFeedback}
              onChange={(promptFeedback) => callbacks.onChange({ promptFeedback })}
            />
          </SettingsSection>
        )}

        {extraSections}

        <SettingsSection title={t("settings.appInfo")}>
          <SettingRow title={t("settings.version")} description={t("settings.versionDesc")}>
            <SettingValue value={app.version} />
          </SettingRow>
          <SettingRow
            title={t("settings.dataDirectory")}
            description={t("settings.dataDirectoryDesc")}
            controlClassName="min-w-0 max-w-[min(42rem,55vw)] gap-2"
          >
            <SettingValue
              value={app.dataDir}
              actions={[
                {
                  title: app.revealPathLabel,
                  icon: "folder_open",
                  onClick: () => callbacks.onRevealPath(app.dataDir),
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
              value={app.logDir}
              actions={[
                {
                  title: app.revealPathLabel,
                  icon: "folder_open",
                  onClick: () => callbacks.onRevealPath(app.logDir),
                },
              ]}
            />
          </SettingRow>
        </SettingsSection>
      </SettingsList>
    </SettingsPage>
  );
}

/** The update channel, how updates install, and the check button */
export function SettingsUpdatesSection({
  view,
  callbacks,
}: {
  view: Pick<SettingsView, "app" | "values" | "updates">;
  callbacks: Pick<SettingsCallbacks, "onChange" | "onCheckForUpdates">;
}) {
  const { t } = useTranslation();
  const { app, values } = view;
  return (
    <SettingsSection title={t("settings.updates")}>
      <SettingRow
        title={t("settings.updateChannel")}
        description={t("settings.updateChannelDesc")}
      >
        <div className="grid grid-cols-[12rem_auto] gap-1">
          <SettingSelectControl
            name="updateChannel"
            label={t("settings.updateChannel")}
            selectClassName="w-full!"
            value={values.updateChannel}
            onChange={(updateChannel) => callbacks.onChange({ updateChannel })}
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
            spin={view.updates?.checking ?? false}
            onClick={() => callbacks.onCheckForUpdates()}
          />
        </div>
      </SettingRow>

      <SettingRowSelect
        title={t("settings.updateBehavior")}
        description={t("settings.updateBehaviorDesc")}
        name="autoupdate"
        value={values.autoupdate ? "auto" : "manual"}
        onChange={(v) => callbacks.onChange({ autoupdate: v === "auto" })}
        options={[
          { label: t("settings.automatic"), value: "auto" },
          { label: t("settings.manual"), value: "manual" },
        ]}
      />

      <SettingRowBoolean
        title={t("settings.autoDownload")}
        description={t("settings.autoDownloadDesc")}
        disabled={!values.autoupdate}
        checked={values.autoDownloadUpdates}
        onChange={(autoDownloadUpdates) => callbacks.onChange({ autoDownloadUpdates })}
      />

      {view.updates?.notificationsSetting !== false && (
        <SettingRowBoolean
          title={t("settings.checkNotifications")}
          description={t("settings.checkNotificationsDesc")}
          checked={values.checkNotifications}
          onChange={(checkNotifications) => callbacks.onChange({ checkNotifications })}
        />
      )}

      <SettingRowBoolean
        title={t("settings.anonymousStats")}
        description={t("settings.anonymousStatsDesc")}
        disabled
        checked={false}
        onChange={() => {}}
      />
    </SettingsSection>
  );
}
