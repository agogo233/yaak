import { i18n } from "@yaakapp-internal/i18n";
import { cookieJarsAtom, patchModel } from "@yaakapp-internal/models";
import { useAtomValue } from "jotai";
import { memo, useMemo } from "react";
import { useActiveCookieJar } from "../hooks/useActiveCookieJar";
import { useCreateCookieJar } from "../hooks/useCreateCookieJar";
import { deleteModelWithConfirm } from "../lib/deleteModelWithConfirm";
import { showPrompt } from "../lib/prompt";
import { setWorkspaceSearchParams } from "../lib/setWorkspaceSearchParams";
import { CookieDialog } from "./CookieDialog";
import { Dropdown, type DropdownItem } from "./core/Dropdown";
import { Icon, InlineCode } from "@yaakapp-internal/ui";
import { IconButton } from "./core/IconButton";

export const CookieDropdown = memo(function CookieDropdown() {
  const activeCookieJar = useActiveCookieJar();
  const createCookieJar = useCreateCookieJar();
  const cookieJars = useAtomValue(cookieJarsAtom);

  const items = useMemo((): DropdownItem[] => {
    return [
      ...(cookieJars ?? []).map((j) => ({
        key: j.id,
        label: j.name,
        leftSlot: <Icon icon={j.id === activeCookieJar?.id ? "check" : "empty"} />,
        onSelect: () => {
          setWorkspaceSearchParams({ cookie_jar_id: j.id });
        },
      })),
      ...(((cookieJars ?? []).length > 0 && activeCookieJar != null
        ? [
            { type: "separator", label: activeCookieJar.name },
            {
              key: "manage",
              label: i18n.t("cookies.manage"),
              leftSlot: <Icon icon="cookie" />,
              onSelect: () => {
                if (activeCookieJar == null) return;
                CookieDialog.show(activeCookieJar.id);
              },
            },
            {
              key: "rename",
              label: i18n.t("common.rename"),
              leftSlot: <Icon icon="pencil" />,
              onSelect: async () => {
                const name = await showPrompt({
                  id: "rename-cookie-jar",
                  title: i18n.t("cookies.renameJarTitle"),
                  description: (
                    <>
                      Enter a new name for <InlineCode>{activeCookieJar?.name}</InlineCode>
                    </>
                  ),
                  label: i18n.t("cookies.name"),
                  confirmText: i18n.t("cookies.save"),
                  placeholder: i18n.t("cookies.newNamePlaceholder"),
                  defaultValue: activeCookieJar?.name,
                });
                if (name == null) return;
                await patchModel(activeCookieJar, { name });
              },
            },
            ...(((cookieJars ?? []).length > 1 // Never delete the last one
              ? [
                  {
                    label: i18n.t("cookies.delete"),
                    leftSlot: <Icon icon="trash" />,
                    color: "danger",
                    onSelect: async () => {
                      await deleteModelWithConfirm(activeCookieJar);
                    },
                  },
                ]
              : []) as DropdownItem[]),
          ]
        : []) as DropdownItem[]),
      { type: "separator" },
      {
        key: "create-cookie-jar",
        label: i18n.t("cookies.newJar"),
        leftSlot: <Icon icon="plus" />,
        onSelect: () => createCookieJar.mutate(),
      },
    ];
  }, [activeCookieJar, cookieJars, createCookieJar]);

  return (
    <Dropdown items={items}>
      <IconButton size="sm" icon="cookie" iconColor="secondary" title="Cookie Jar" />
    </Dropdown>
  );
});
