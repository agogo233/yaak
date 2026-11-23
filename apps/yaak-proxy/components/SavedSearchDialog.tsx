import { i18n } from "@yaakapp-internal/i18n";
import { Dialog, DialogFooter, PlainInput } from "@yaakapp-internal/ui";
import { atom, useAtom } from "jotai";
import { useState } from "react";
import { useRpcMutation } from "../hooks/useRpcMutation";
import { useShowToast } from "../lib/toast";

/** Saving the search box's text under a name, or renaming a saved search */
export type SavedSearchDialog =
  | { mode: "save"; query: string }
  | { mode: "rename"; id: string; name: string };

export const savedSearchDialogAtom = atom<SavedSearchDialog | null>(null);

const FORM_ID = "saved-search";

/** Names a saved search, as `savedSearchDialogAtom` asks */
export function SavedSearchDialog() {
  const [dialog, setDialog] = useAtom(savedSearchDialogAtom);
  if (dialog == null) return null;
  // Keyed, so each opening starts from its own name.
  return (
    <NameDialog
      key={dialog.mode === "save" ? `save:${dialog.query}` : `rename:${dialog.id}`}
      dialog={dialog}
      onClose={() => setDialog(null)}
    />
  );
}

function NameDialog({ dialog, onClose }: { dialog: SavedSearchDialog; onClose: () => void }) {
  const [name, setName] = useState(dialog.mode === "rename" ? dialog.name : "");
  const showToast = useShowToast();
  const onError = (err: Error) =>
    showToast({ id: "saved-search", message: err.message, color: "danger" });
  const create = useRpcMutation("create_saved_query", { onSuccess: onClose, onError });
  const rename = useRpcMutation("rename_saved_query", { onSuccess: onClose, onError });
  const busy = create.isPending || rename.isPending;

  const submit = () => {
    if (name.trim() === "" || busy) return;
    if (dialog.mode === "save") create.mutate({ name, query: dialog.query });
    else rename.mutate({ id: dialog.id, name });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="dynamic"
      title={dialog.mode === "save" ? i18n.t("flows.saveSearchTitle") : i18n.t("flows.renameSearchTitle")}
      className="w-[26rem]"
    >
      <form
        id={FORM_ID}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <PlainInput
          label={i18n.t("flows.nameField")}
          autoFocus
          defaultValue={name}
          onChange={setName}
          placeholder={dialog.mode === "save" ? dialog.query : undefined}
        />
      </form>
      <DialogFooter
        actions={[
          { label: i18n.t("common.cancel"), variant: "border", onClick: onClose },
          {
            label: dialog.mode === "save" ? i18n.t("flows.saveBtn") : i18n.t("common.rename"),
            color: "primary",
            form: FORM_ID,
            disabled: name.trim() === "",
            isLoading: busy,
          },
        ]}
      />
    </Dialog>
  );
}
