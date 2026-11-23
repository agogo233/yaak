import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { clamp } from "../../lib/clamp";
import { Button } from "../Button";
import { Checkbox } from "../Checkbox";
import {
  SettingRow,
  SettingRowBoolean,
  SettingRowSelect,
  SettingSelectControl,
  SettingsList,
  SettingsSection,
} from "./SettingRow";
import { SettingsPage } from "./SettingsPage";
import type {
  SettingsCallbacks,
  SettingsEditorKeymap,
  SettingsInterfaceRow,
  SettingsView,
} from "./types";

const NULL_FONT_VALUE = "__NULL_FONT__";

const fontSizeOptions = [
  8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
].map((n) => ({ label: `${n}`, value: `${n}` }));

export interface SettingsInterfaceProps {
  view: SettingsView;
  callbacks: SettingsCallbacks;
  /** Sections only this app has, shown first, like the client's Workspaces */
  leadingSections?: ReactNode;
  /** Sections only this app has, shown last, like the client's License */
  trailingSections?: ReactNode;
}

export function SettingsInterface({
  view,
  callbacks,
  leadingSections,
  trailingSections,
}: SettingsInterfaceProps) {
  const { t } = useTranslation();
  const { values, fonts } = view;
  const shown = (row: SettingsInterfaceRow) => !view.hiddenInterfaceRows?.includes(row);

  const keymaps: { value: SettingsEditorKeymap; label: string }[] = [
    { value: "default", label: t("interface.keymapDefault") },
    { value: "vim", label: "Vim" },
    { value: "vscode", label: "VSCode" },
    { value: "emacs", label: "Emacs" },
  ];

  return (
    <SettingsPage title={t("interface.title")} description={t("interface.titleDesc")}>
      <SettingsList className="space-y-8">
        {leadingSections}

        <SettingsSection title={t("interface.fonts")}>
          <SettingRow
            title={t("interface.interfaceFont")}
            description={t("interface.interfaceFontDesc")}
            controlClassName="gap-1"
          >
            {fonts && (
              <SettingSelectControl
                name="uiFont"
                label={t("interface.interfaceFont")}
                selectClassName="w-72!"
                value={values.interfaceFont ?? NULL_FONT_VALUE}
                defaultValue={NULL_FONT_VALUE}
                options={[
                  { label: t("interface.systemDefault"), value: NULL_FONT_VALUE },
                  ...fonts.uiFonts.map((f) => ({ label: f, value: f })),
                  ...fonts.editorFonts.map((f) => ({ label: f, value: f })),
                ]}
                onChange={(v) =>
                  callbacks.onChange({ interfaceFont: v === NULL_FONT_VALUE ? null : v })
                }
              />
            )}
            <SettingSelectControl
              name="interfaceFontSize"
              label={t("interface.interfaceFontSize")}
              selectClassName="w-20!"
              value={`${values.interfaceFontSize}`}
              defaultValue="14"
              options={fontSizeOptions}
              onChange={(v) => callbacks.onChange({ interfaceFontSize: Number.parseInt(v, 10) })}
            />
          </SettingRow>

          <SettingRow
            title={t("interface.editorFont")}
            description={t("interface.editorFontDesc")}
            controlClassName="gap-1"
          >
            {fonts && (
              <SettingSelectControl
                name="editorFont"
                label={t("interface.editorFont")}
                selectClassName="w-72!"
                value={values.editorFont ?? NULL_FONT_VALUE}
                defaultValue={NULL_FONT_VALUE}
                options={[
                  { label: t("interface.systemDefault"), value: NULL_FONT_VALUE },
                  ...fonts.editorFonts.map((f) => ({ label: f, value: f })),
                ]}
                onChange={(v) =>
                  callbacks.onChange({ editorFont: v === NULL_FONT_VALUE ? null : v })
                }
              />
            )}
            <SettingSelectControl
              name="editorFontSize"
              label={t("interface.editorFontSize")}
              selectClassName="w-20!"
              value={`${values.editorFontSize}`}
              defaultValue="12"
              options={fontSizeOptions}
              onChange={(v) =>
                callbacks.onChange({
                  editorFontSize: clamp(Number.parseInt(v, 10) || 14, 8, 30),
                })
              }
            />
          </SettingRow>
        </SettingsSection>

        {(shown("editorKeymap") || shown("editorSoftWrap") || shown("coloredMethods")) && (
          <SettingsSection title={t("interface.editor")}>
            {shown("editorKeymap") && (
              <SettingRowSelect
                name="editorKeymap"
                title={t("interface.keymap")}
                description={t("interface.keymapDesc")}
                value={values.editorKeymap}
                onChange={(editorKeymap) => callbacks.onChange({ editorKeymap })}
                options={keymaps}
              />
            )}
            {shown("editorSoftWrap") && (
              <SettingRowBoolean
                title={t("interface.softWrap")}
                description={t("interface.softWrapDesc")}
                checked={values.editorSoftWrap}
                onChange={(editorSoftWrap) => callbacks.onChange({ editorSoftWrap })}
              />
            )}
            {shown("coloredMethods") && (
              <SettingRowBoolean
                title={t("interface.coloredMethods")}
                description={t("interface.coloredMethodsDesc")}
                checked={values.coloredMethods}
                onChange={(coloredMethods) => callbacks.onChange({ coloredMethods })}
              />
            )}
          </SettingsSection>
        )}

        {(shown("nativeTitlebar") || view.windowControlsSetting) && (
          <SettingsSection title={t("interface.window")}>
            {shown("nativeTitlebar") && (
              <NativeTitlebarSetting
                useNativeTitlebar={values.useNativeTitlebar}
                onApply={callbacks.onApplyNativeTitlebar}
              />
            )}
            {view.windowControlsSetting && (
              <SettingRowBoolean
                title={t("interface.hideWindowControls")}
                description={t("interface.hideWindowControlsDesc")}
                checked={values.hideWindowControls}
                onChange={(hideWindowControls) => callbacks.onChange({ hideWindowControls })}
              />
            )}
          </SettingsSection>
        )}

        {trailingSections}
      </SettingsList>
    </SettingsPage>
  );
}

function NativeTitlebarSetting({
  useNativeTitlebar,
  onApply,
}: {
  useNativeTitlebar: boolean;
  onApply: SettingsCallbacks["onApplyNativeTitlebar"];
}) {
  const { t } = useTranslation();
  const [nativeTitlebar, setNativeTitlebar] = useState(useNativeTitlebar);

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
      {useNativeTitlebar !== nativeTitlebar && (
        <Button color="primary" size="xs" onClick={() => onApply(nativeTitlebar)}>
          {t("interface.applyAndRestart")}
        </Button>
      )}
    </SettingRow>
  );
}
