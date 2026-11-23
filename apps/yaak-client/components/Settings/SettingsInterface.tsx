import { platform } from "@yaakapp-internal/platform";
import { useFonts } from "@yaakapp-internal/fonts";
import { useLicense } from "@yaakapp-internal/license";
import type { EditorKeymap, Settings } from "@yaakapp-internal/models";
import { patchModel, settingsAtom } from "@yaakapp-internal/models";
import { clamp, Heading, VStack } from "@yaakapp-internal/ui";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { activeWorkspaceAtom } from "../../hooks/useActiveWorkspace";
import { showConfirm } from "../../lib/confirm";
import { pricingUrl } from "../../lib/pricingUrl";
import { rpc } from "../../lib/rpc";
import { CargoFeature } from "../CargoFeature";
import { Button } from "../core/Button";
import { Checkbox } from "../core/Checkbox";
import { Link } from "../core/Link";
import {
  ModelSettingRowBoolean,
  ModelSettingRowSelect,
  SettingRow,
  SettingRowBoolean,
  SettingRowSelect,
  SettingSelectControl,
  SettingsList,
  SettingsSection,
} from "../core/SettingRow";

const NULL_FONT_VALUE = "__NULL_FONT__";

const fontSizeOptions = [
  8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
].map((n) => ({ label: `${n}`, value: `${n}` }));

export function SettingsInterface() {
  const workspace = useAtomValue(activeWorkspaceAtom);
  const settings = useAtomValue(settingsAtom);
  const fonts = useFonts();
  const { t } = useTranslation();

  if (settings == null || workspace == null) {
    return null;
  }

  const keymaps: { value: EditorKeymap; label: string }[] = [
    { value: "default", label: t("interface.keymapDefault") },
    { value: "vim", label: "Vim" },
    { value: "vscode", label: "VSCode" },
    { value: "emacs", label: "Emacs" },
  ];

  return (
    <VStack space={1.5} className="mb-4">
      <div className="mb-3">
        <Heading>{t("interface.title")}</Heading>
        <p className="text-text-subtle">{t("interface.titleDesc")}</p>
      </div>
      <SettingsList className="space-y-8">
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

        <SettingsSection title={t("interface.fonts")}>
          <SettingRow
            title={t("interface.interfaceFont")}
            description={t("interface.interfaceFontDesc")}
            controlClassName="gap-1"
          >
            {fonts.data && (
              <SettingSelectControl
                name="uiFont"
                label={t("interface.interfaceFont")}
                selectClassName="w-72!"
                value={settings.interfaceFont ?? NULL_FONT_VALUE}
                defaultValue={NULL_FONT_VALUE}
                options={[
                  { label: t("interface.systemDefault"), value: NULL_FONT_VALUE },
                  ...fonts.data.uiFonts.map((f) => ({ label: f, value: f })),
                  ...fonts.data.editorFonts.map((f) => ({ label: f, value: f })),
                ]}
                onChange={async (v) => {
                  const interfaceFont = v === NULL_FONT_VALUE ? null : v;
                  await patchModel(settings, { interfaceFont });
                }}
              />
            )}
            <SettingSelectControl
              name="interfaceFontSize"
              label={t("interface.interfaceFontSize")}
              selectClassName="w-20!"
              value={`${settings.interfaceFontSize}`}
              defaultValue="14"
              options={fontSizeOptions}
              onChange={(v) => patchModel(settings, { interfaceFontSize: Number.parseInt(v, 10) })}
            />
          </SettingRow>

          <SettingRow
            title={t("interface.editorFont")}
            description={t("interface.editorFontDesc")}
            controlClassName="gap-1"
          >
            {fonts.data && (
              <SettingSelectControl
                name="editorFont"
                label={t("interface.editorFont")}
                selectClassName="w-72!"
                value={settings.editorFont ?? NULL_FONT_VALUE}
                defaultValue={NULL_FONT_VALUE}
                options={[
                  { label: t("interface.systemDefault"), value: NULL_FONT_VALUE },
                  ...fonts.data.editorFonts.map((f) => ({ label: f, value: f })),
                ]}
                onChange={async (v) => {
                  const editorFont = v === NULL_FONT_VALUE ? null : v;
                  await patchModel(settings, { editorFont });
                }}
              />
            )}
            <SettingSelectControl
              name="editorFontSize"
              label={t("interface.editorFontSize")}
              selectClassName="w-20!"
              value={`${settings.editorFontSize}`}
              defaultValue="12"
              options={fontSizeOptions}
              onChange={(v) =>
                patchModel(settings, {
                  editorFontSize: clamp(Number.parseInt(v, 10) || 14, 8, 30),
                })
              }
            />
          </SettingRow>
        </SettingsSection>

        <SettingsSection title={t("interface.editor")}>
          <ModelSettingRowSelect
            model={settings}
            modelKey="editorKeymap"
            title={t("interface.keymap")}
            description={t("interface.keymapDesc")}
            options={keymaps}
          />
          <ModelSettingRowBoolean
            model={settings}
            modelKey="editorSoftWrap"
            title={t("interface.softWrap")}
            description={t("interface.softWrapDesc")}
          />
          <ModelSettingRowBoolean
            model={settings}
            modelKey="coloredMethods"
            title={t("interface.coloredMethods")}
            description={t("interface.coloredMethodsDesc")}
          />
        </SettingsSection>

        <SettingsSection title={t("interface.window")}>
          <NativeTitlebarSetting settings={settings} />
          {platform.osType() !== "macos" && (
            <ModelSettingRowBoolean
              model={settings}
              modelKey="hideWindowControls"
              title={t("interface.hideWindowControls")}
              description={t("interface.hideWindowControlsDesc")}
            />
          )}
        </SettingsSection>

        <CargoFeature feature="license">
          <LicenseSettings settings={settings} />
        </CargoFeature>
      </SettingsList>
    </VStack>
  );
}

function NativeTitlebarSetting({ settings }: { settings: Settings }) {
  const [nativeTitlebar, setNativeTitlebar] = useState(settings.useNativeTitlebar);
  const { t } = useTranslation();

  return (
    <SettingRow
      title={t("interface.nativeTitlebar")}
      description={t("interface.nativeTitlebarDesc")}
      controlClassName="gap-2"
    >
      <Checkbox
        hideLabel
        size="md"
        checked={nativeTitlebar}
        title={t("interface.nativeTitlebar")}
        onChange={setNativeTitlebar}
      />
      {settings.useNativeTitlebar !== nativeTitlebar && (
        <Button
          color="primary"
          size="xs"
          onClick={async () => {
            await patchModel(settings, { useNativeTitlebar: nativeTitlebar });
            await rpc("cmd_restart");
          }}
        >
          {t("interface.applyAndRestart")}
        </Button>
      )}
    </SettingRow>
  );
}

function LicenseSettings({ settings }: { settings: Settings }) {
  const license = useLicense();
  const { t } = useTranslation();
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
