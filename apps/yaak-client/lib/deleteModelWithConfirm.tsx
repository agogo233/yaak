import type { AnyModel } from "@yaakapp-internal/models";
import { deleteModel, modelTypeLabel } from "@yaakapp-internal/models";
import { InlineCode } from "@yaakapp-internal/ui";
import { i18n } from "@yaakapp-internal/i18n";
import { Prose } from "../components/Prose";
import { showConfirmDelete } from "./confirm";
import { resolvedModelName } from "./resolvedModelName";

export async function deleteModelWithConfirm(
  model: AnyModel | AnyModel[] | null,
  options: { confirmName?: string } = {},
): Promise<boolean> {
  if (model == null) {
    console.warn("Tried to delete null model");
    return false;
  }
  const models = Array.isArray(model) ? model : [model];
  const firstModel = models[0];
  if (firstModel == null) return false;

  const title =
    models.length === 1
      ? i18n.t("dialog.deleteTitleOne", { type: modelTypeLabel(firstModel) })
      : i18n.t("dialog.deleteTitleMany", { count: models.length });
  const confirmed = await showConfirmDelete({
    id: `delete-model-${models.map((m) => m.id).join(",")}`,
    title,
    requireTyping: options.confirmName,
    description: (
      <>
        {i18n.t("dialog.deleteDescPrefix")}{" "}
        {models.length === 1 ? (
          <>
            <InlineCode>{resolvedModelName(firstModel)}</InlineCode>
            {i18n.t("dialog.deleteDescQuestion")}
          </>
        ) : models.length < 10 ? (
          <>
            {i18n.t("dialog.deleteDescTheFollowing")}
            <Prose className="mt-2">
              <ul className="space-y-1">
                {models.map((m) => (
                  <li key={m.id}>
                    <InlineCode
                      className="inline-block truncate align-bottom max-w-full"
                      title={resolvedModelName(m)}
                    >
                      {resolvedModelName(m)}
                    </InlineCode>
                  </li>
                ))}
              </ul>
            </Prose>
          </>
        ) : (
          i18n.t("dialog.deleteAll", { count: models.length })
        )}
      </>
    ),
  });

  if (!confirmed) {
    return false;
  }

  await Promise.allSettled(models.map((m) => deleteModel(m)));
  return true;
}
