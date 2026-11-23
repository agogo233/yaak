import { useLicense } from "@yaakapp-internal/license";
import type { Settings } from "@yaakapp-internal/models";
import { patchModel, settingsAtom } from "@yaakapp-internal/models";
import { SettingsInterface as SharedSettingsInterface, VStack } from "@yaakapp-internal/ui";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { activeWorkspaceAtom } from "../../hooks/useActiveWorkspace";
import { useSettingsView } from "../../hooks/useSettingsView";
import { showConfirm } from "../../lib/confirm";
import { pricingUrl } from "../../lib/pricingUrl";
import { CargoFeature } from "../CargoFeature";
import { Link } from "../core/Link";
import { SettingRowBoolean, SettingRowSelect, SettingsSection } from "../core/SettingRow";

export function SettingsInterface() {
  const { t } = useTranslation();
  const workspace = useAtomValue(activeWorkspaceAtom);
  const settings = useAtomValue(settingsAtom);
  const bound = useSettingsView();

  if (settings == null || workspace == null || bound == null) {
    return null;
  }

  return (
    <SharedSettingsInterface
      view={bound.view}
      callbacks={bound.callbacks}
      leadingSections={
        <SettingsSection title={t("interface.workspaces")}>
          <SettingRowSelect
            title={t("interface.openBehavior")}
            description={t("interface.openBehaviorDesc")}
            name="switchWorkspaceBehavior"
            value={
              settings.openWorkspaceNewWindow === true
                ? "new"
                : settings.openWorkspaceNewWindow === false
                  ? "current"
                  : "ask"
            }
            onChange={async (v) => {
              if (v === "current") await patchModel(settings, { openWorkspaceNewWindow: false });
              else if (v === "new") await patchModel(settings, { openWorkspaceNewWindow: true });
              else await patchModel(settings, { openWorkspaceNewWindow: null });
            }}
            options={[
              { label: t("interface.alwaysAsk"), value: "ask" },
              { label: t("interface.openCurrentWindow"), value: "current" },
              { label: t("interface.openNewWindow"), value: "new" },
            ]}
          />
        </SettingsSection>
      }
      trailingSections={
        <CargoFeature feature="license">
          <LicenseSettings settings={settings} />
        </CargoFeature>
      }
    />
  );
}

function LicenseSettings({ settings }: { settings: Settings }) {
  const { t } = useTranslation();
  const license = useLicense();
  if (license.check.data?.status !== "personal_use") {
    return null;
  }

  return (
    <SettingsSection title={t("interface.license")}>
      <SettingRowBoolean
        checked={settings.hideLicenseBadge}
        title={t("interface.hideBadge")}
        description={t("interface.hideBadgeDesc")}
        onChange={async (hideLicenseBadge) => {
          if (hideLicenseBadge) {
            const confirmed = await showConfirm({
              id: "hide-license-badge",
              title: t("interface.confirmPersonalUse"),
              confirmText: t("interface.confirm"),
              description: (
                <VStack space={3}>
                  <p>{t("interface.personalUseGreeting")}</p>
                  <p>
                    {t("interface.licenseBody1")}{" "}
                    <strong>{t("interface.licenseBody1Strong")}</strong>
                  </p>
                  <p>
                    {t("interface.licenseBody2")}{" "}
                    <Link href={pricingUrl("app.license.badge-hide-confirm")}>
                      {t("interface.purchaseLicense")}
                    </Link>
                  </p>
                </VStack>
              ),
              requireTyping: t("interface.requireTyping"),
              color: "info",
            });
            if (!confirmed) {
              return;
            }
          }
          await patchModel(settings, { hideLicenseBadge });
        }}
      />
    </SettingsSection>
  );
}
