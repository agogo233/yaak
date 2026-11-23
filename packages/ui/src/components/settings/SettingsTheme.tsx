import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import type { ButtonProps } from "../Button";
import { useEditorHost } from "../EditorHost";
import { ExternalLink } from "../ExternalLink";
import { Icon, type IconProps } from "../Icon";
import { IconButton } from "../IconButton";
import type { SelectProps } from "../Select";
import { HStack, VStack } from "../Stacks";
import { SettingRowSelect, SettingsList, SettingsSection } from "./SettingRow";
import { SettingsPage } from "./SettingsPage";
import type { SettingsCallbacks, SettingsView } from "./types";

const buttonColors: ButtonProps["color"][] = [
  "primary",
  "info",
  "success",
  "notice",
  "warning",
  "danger",
  "secondary",
  "default",
];

const icons: IconProps["icon"][] = [
  "info",
  "box",
  "update",
  "alert_triangle",
  "arrow_big_right_dash",
  "download",
  "copy",
  "magic_wand",
  "settings",
  "trash",
  "sparkles",
  "pencil",
  "paste",
  "search",
  "send_horizontal",
];

export interface SettingsThemeProps {
  view: SettingsView;
  callbacks: SettingsCallbacks;
}

export function SettingsTheme({ view, callbacks }: SettingsThemeProps) {
  const { t } = useTranslation();
  const { Editor } = useEditorHost();
  const { values, themes } = view;

  if (themes == null) {
    return null;
  }

  const lightThemes: SelectProps<string>["options"] = themes.themes
    .filter((theme) => !theme.dark)
    .map((theme) => ({
      label: theme.label,
      value: theme.id,
    }));

  const darkThemes: SelectProps<string>["options"] = themes.themes
    .filter((theme) => theme.dark)
    .map((theme) => ({
      label: theme.label,
      value: theme.id,
    }));

  return (
    <SettingsPage
      title={t("theme.title")}
      description={
        <>
          {/* One text node, so the name kerns with the words around it */}
          {t("theme.makeOwn")}{" "}
          <ExternalLink
            href="https://yaak.app/docs/plugin-development/plugins-quick-start"
            onOpen={callbacks.onOpenUrl}
          >
            {t("theme.createYourOwn")}
          </ExternalLink>
        </>
      }
    >
      <SettingsList className="space-y-8">
        <SettingsSection title={t("theme.title")}>
          <SettingRowSelect
            name="appearance"
            title={t("theme.appearance")}
            description={t("theme.appearanceDesc")}
            value={values.appearance}
            onChange={(appearance) => callbacks.onChange({ appearance })}
            options={[
              { label: t("theme.automatic"), value: "system" },
              { label: t("theme.light"), value: "light" },
              { label: t("theme.dark"), value: "dark" },
            ]}
          />
          {(values.appearance === "system" || values.appearance === "light") && (
            <SettingRowSelect
              name="lightTheme"
              title={t("theme.lightTheme")}
              description={t("theme.lightThemeDesc")}
              value={themes.light.id}
              options={lightThemes}
              onChange={(themeLight) => callbacks.onChange({ themeLight })}
            />
          )}
          {(values.appearance === "system" || values.appearance === "dark") && (
            <SettingRowSelect
              name="darkTheme"
              title={t("theme.darkTheme")}
              description={t("theme.darkThemeDesc")}
              value={themes.dark.id}
              options={darkThemes}
              onChange={(themeDark) => callbacks.onChange({ themeDark })}
            />
          )}
        </SettingsSection>

        <SettingsSection title={t("theme.preview")}>
          <VStack
            space={3}
            className="mt-4 w-full bg-surface p-3 border border-dashed border-border-subtle rounded-sm overflow-x-auto"
          >
            <HStack className="text" space={1.5}>
              <Icon icon={themes.resolvedAppearance === "dark" ? "moon" : "sun"} />
              <strong>{themes.active.label}</strong>
              <em>({t("theme.previewLabel")})</em>
            </HStack>
            <HStack space={1.5} className="w-full">
              {buttonColors.map((c, i) => (
                <IconButton
                  key={c}
                  color={c}
                  size="2xs"
                  iconSize="xs"
                  icon={icons[i % icons.length] ?? "info"}
                  iconClassName="text"
                  title={`${c}`}
                />
              ))}
              {buttonColors.map((c, i) => (
                <IconButton
                  key={c}
                  color={c}
                  variant="border"
                  size="2xs"
                  iconSize="xs"
                  icon={icons[i % icons.length] ?? "info"}
                  iconClassName="text"
                  title={`${c}`}
                />
              ))}
            </HStack>
            <Suspense>
              <Editor
                defaultValue={[
                  "let foo = { // Demo code editor",
                  '  foo: ("bar" || "baz" ?? \'qux\'),',
                  "  baz: [1, 10.2, null, false, true],",
                  "};",
                ].join("\n")}
                heightMode="auto"
                language="javascript"
                stateKey={null}
              />
            </Suspense>
          </VStack>
        </SettingsSection>
      </SettingsList>
    </SettingsPage>
  );
}
