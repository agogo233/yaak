import type { AnyModel } from "@yaakapp-internal/models";
import { patchModel } from "@yaakapp-internal/models";
import { InlineCode } from "@yaakapp-internal/ui";
import { i18n } from "@yaakapp-internal/i18n";
import { showPrompt } from "./prompt";

export async function renameModelWithPrompt(model: Extract<AnyModel, { name: string }> | null) {
  if (model == null) {
    throw new Error("Tried to rename null model");
  }

  const name = await showPrompt({
    id: "rename-request",
    title: i18n.t("dialog.renameRequest"),
    required: false,
    description:
      model.name === "" ? (
        i18n.t("dialog.enterNewName")
      ) : (
        <>
          {i18n.t("dialog.renamePrefix")} <InlineCode>{model.name}</InlineCode>{" "}
          {i18n.t("dialog.renameSuffix")}
        </>
      ),
    label: i18n.t("dialog.name"),
    placeholder: i18n.t("dialog.newNamePlaceholder"),
    defaultValue: model.name,
    confirmText: i18n.t("dialog.save"),
  });

  if (name == null) return;

  await patchModel(model, { name });
}
