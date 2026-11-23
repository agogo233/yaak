import type { Folder } from "@yaakapp-internal/models";
import { modelTypeLabel, patchModel } from "@yaakapp-internal/models";
import { HStack, Icon, InlineCode, IconTooltip } from "@yaakapp-internal/ui";
import { i18n } from "@yaakapp-internal/i18n";
import { useMemo } from "react";
import { openFolderSettings } from "../commands/openFolderSettings";
import { openWorkspaceSettings } from "../commands/openWorkspaceSettings";
import type { RadioDropdownProps } from "../components/core/RadioDropdown";
import type { TabItem } from "../components/core/Tabs/Tabs";
import { capitalize } from "../lib/capitalize";
import { showConfirm } from "../lib/confirm";
import { resolvedModelName } from "../lib/resolvedModelName";
import { useHttpAuthenticationSummaries } from "./useHttpAuthentication";
import type { AuthenticatedModel } from "./useInheritedAuthentication";
import { useInheritedAuthentication } from "./useInheritedAuthentication";
import { useModelAncestors } from "./useModelAncestors";

export function useAuthTab<T extends string>(
  tabValue: T,
  model: AuthenticatedModel | null,
) {
  const options = useAuthDropdownOptions(model);

  return useMemo<TabItem[]>(() => {
    if (model == null || options == null) return [];

    const tab: TabItem = {
      value: tabValue,
      label: i18n.t("request.auth"),
      options,
    };

    return [tab];
  }, [model, options, tabValue]);
}

export function useAuthDropdownOptions(
  model: AuthenticatedModel | null,
): Omit<RadioDropdownProps, "children"> | null {
  const authentication = useHttpAuthenticationSummaries();
  const inheritedAuth = useInheritedAuthentication(model);
  const ancestors = useModelAncestors(model);
  const parentModel = ancestors[0] ?? null;

  return useMemo(() => {
    if (model == null) return null;

    return {
      value: model.authenticationType,
      items: [
        ...authentication.map((a) => ({
          label: a.label || "UNKNOWN",
          shortLabel: a.shortLabel,
          value: a.name,
        })),
        { type: "separator" },
        {
          label: i18n.t("request.inheritFromParent"),
          shortLabel:
            inheritedAuth != null &&
            inheritedAuth.authenticationType !== "none" ? (
              <HStack space={1.5}>
                {authentication.find(
                  (a) => a.name === inheritedAuth.authenticationType,
                )?.shortLabel ?? "UNKNOWN"}
                <IconTooltip
                  icon="zap_off"
                  iconSize="xs"
                  content={i18n.t("request.authInherited")}
                />
              </HStack>
            ) : (
              i18n.t("request.auth")
            ),
          value: null,
        },
        { label: i18n.t("request.noAuth"), shortLabel: i18n.t("request.noAuth"), value: "none" },
      ],
      itemsAfter: (() => {
        const actions: (
          | { type: "separator"; label: string }
          | {
              label: string;
              leftSlot: React.ReactNode;
              onSelect: () => Promise<void>;
            }
        )[] = [];

        // Promote: move auth from current model up to parent
        if (
          parentModel &&
          model.authenticationType &&
          model.authenticationType !== "none" &&
          (parentModel.authenticationType == null ||
            parentModel.authenticationType === "none")
        ) {
          actions.push(
            { type: "separator", label: i18n.t("request.actions") },
            {
              label: i18n.t("request.promoteTo", { type: capitalize(parentModel.model) }),
              leftSlot: (
                <Icon
                  icon={
                    parentModel.model === "workspace"
                      ? "corner_right_up"
                      : "folder_up"
                  }
                />
              ),
              onSelect: async () => {
                const confirmed = await showConfirm({
                  id: "promote-auth-confirm",
                  title: i18n.t("request.promoteTitle"),
                  confirmText: i18n.t("request.promote"),
                  description: (
                    <>
                      {i18n.t("request.promoteDescPrefix")}
                      <InlineCode>{resolvedModelName(parentModel)}</InlineCode>
                      {i18n.t("request.promoteDescSuffix")}
                    </>
                  ),
                });
                if (confirmed) {
                  await patchModel(model, {
                    authentication: {},
                    authenticationType: null,
                  });
                  await patchModel(parentModel, {
                    authentication: model.authentication,
                    authenticationType: model.authenticationType,
                  });

                  if (parentModel.model === "folder") {
                    openFolderSettings(parentModel.id, "auth");
                  } else {
                    openWorkspaceSettings("auth");
                  }
                }
              },
            },
          );
        }

        // Copy from ancestor: copy auth config down to current model
        const ancestorWithAuth = ancestors.find(
          (a) =>
            a.authenticationType != null && a.authenticationType !== "none",
        );
        if (ancestorWithAuth) {
          if (actions.length === 0) {
            actions.push({ type: "separator", label: i18n.t("request.actions") });
          }
          actions.push({
            label: i18n.t("request.copyFrom", { type: modelTypeLabel(ancestorWithAuth) }),
            leftSlot: (
              <Icon
                icon={
                  ancestorWithAuth.model === "workspace"
                    ? "corner_right_down"
                    : "folder_down"
                }
              />
            ),
            onSelect: async () => {
              const confirmed = await showConfirm({
                id: "copy-auth-confirm",
                title: i18n.t("request.copyTitle"),
                confirmText: i18n.t("request.copy"),
                description: (
                  <>
                    {i18n.t("request.copyDescPrefix", {
                      auth:
                        authentication.find(
                          (a) => a.name === ancestorWithAuth.authenticationType,
                        )?.label ?? i18n.t("request.authFallback"),
                    })}{" "}
                    <InlineCode>
                      {resolvedModelName(ancestorWithAuth)}
                    </InlineCode>
                    {i18n.t("request.copyDescMid", {
                      model: modelTypeLabel(ancestorWithAuth).toLowerCase(),
                    })}
                  </>
                ),
              });
              if (confirmed) {
                await patchModel(model, {
                  authentication: { ...ancestorWithAuth.authentication },
                  authenticationType: ancestorWithAuth.authenticationType,
                });
              }
            },
          });
        }

        return actions.length > 0 ? actions : undefined;
      })(),
      onChange: async (authenticationType) => {
        let authentication: Folder["authentication"] = model.authentication;
        if (model.authenticationType !== authenticationType) {
          authentication = {
            // Reset auth if changing types
          };
        }
        await patchModel(model, { authentication, authenticationType });
      },
    };
  }, [authentication, inheritedAuth, model, parentModel, ancestors]);
}
