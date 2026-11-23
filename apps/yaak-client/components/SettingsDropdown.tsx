import { i18n } from "@yaakapp-internal/i18n";
import { useLicense } from "@yaakapp-internal/license";
import { useRef } from "react";
import { openSettings } from "../commands/openSettings";
import { useCheckForUpdates } from "../hooks/useCheckForUpdates";
import { useExportData } from "../hooks/useExportData";
import { appInfo } from "../lib/appInfo";
import { showDialog } from "../lib/dialog";
import { importData } from "../lib/importData";
import { pricingUrl } from "../lib/pricingUrl";
import type { DropdownRef } from "./core/Dropdown";
import { Dropdown } from "./core/Dropdown";
import { Icon } from "@yaakapp-internal/ui";
import { IconButton } from "./core/IconButton";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { platform } from "@yaakapp-internal/platform";

export function SettingsDropdown() {
  const exportData = useExportData();
  const dropdownRef = useRef<DropdownRef>(null);
  const checkForUpdates = useCheckForUpdates();
  const { check } = useLicense();

  return (
    <Dropdown
      ref={dropdownRef}
      items={[
        {
          label: i18n.t("settings.title"),
          hotKeyAction: "settings.show",
          leftSlot: <Icon icon="settings" />,
          onSelect: () => openSettings.mutate(null),
        },
        {
          label: i18n.t("settings.keyboardShortcuts"),
          hotKeyAction: "hotkeys.showHelp",
          leftSlot: <Icon icon="keyboard" />,
          onSelect: () => {
            showDialog({
              id: "hotkey",
              title: i18n.t("settings.keyboardShortcuts"),
              size: "dynamic",
              render: () => <KeyboardShortcutsDialog />,
            });
          },
        },
        {
          label: i18n.t("settings.plugins"),
          leftSlot: <Icon icon="puzzle" />,
          onSelect: () => openSettings.mutate("plugins"),
        },
        { type: "separator", label: i18n.t("settings.shareWorkspaces") },
        {
          label: i18n.t("settings.importData"),
          leftSlot: <Icon icon="folder_input" />,
          onSelect: () => importData.mutate(),
        },
        {
          label: i18n.t("settings.exportData"),
          leftSlot: <Icon icon="folder_output" />,
          onSelect: () => exportData.mutate(),
        },
        {
          label: i18n.t("settings.createRunButton"),
          leftSlot: <Icon icon="rocket" />,
          onSelect: () => platform.openUrl("https://yaak.app/button/new"),
        },
        { type: "separator", label: `Yaak v${appInfo.version}` },
        {
          label: i18n.t("settings.checkForUpdates"),
          leftSlot: <Icon icon="update" />,
          hidden: !appInfo.featureUpdater,
          onSelect: () => checkForUpdates.mutate(),
        },
        {
          label: i18n.t("settings.purchaseLicense"),
          color: "success",
          hidden: check.data == null || check.data.status === "active",
          leftSlot: <Icon icon="circle_dollar_sign" />,
          rightSlot: <Icon icon="external_link" color="success" className="opacity-60" />,
          onSelect: () =>
            platform.openUrl(pricingUrl(`app.menu.purchase.${check.data?.status ?? "unknown"}`)),
        },
        {
          label: i18n.t("settings.installCli"),
          hidden: appInfo.cliVersion != null || !platform.capabilities.agents,
          leftSlot: <Icon icon="square_terminal" />,
          onSelect: () => openSettings.mutate("agents"),
        },
        {
          label: i18n.t("settings.feedback"),
          leftSlot: <Icon icon="chat" />,
          rightSlot: <Icon icon="external_link" color="secondary" />,
          onSelect: () => platform.openUrl("https://yaak.app/feedback"),
        },
        {
          label: i18n.t("settings.changelog"),
          leftSlot: <Icon icon="cake" />,
          rightSlot: <Icon icon="external_link" color="secondary" />,
          onSelect: () => platform.openUrl(`https://yaak.app/changelog/${appInfo.version}`),
        },
      ]}
    >
      <IconButton
        size="sm"
        title={i18n.t("settings.mainMenu")}
        icon="settings"
        iconColor="secondary"
        className="pointer-events-auto"
      />
    </Dropdown>
  );
}
