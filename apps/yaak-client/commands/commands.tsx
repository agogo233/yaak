import { createWorkspaceModel, type Folder, modelTypeLabel } from "@yaakapp-internal/models";
import { i18n } from "@yaakapp-internal/i18n";
import { applySync, calculateSync } from "@yaakapp-internal/sync";
import { Button } from "../components/core/Button";
import {
  Banner,
  InlineCode,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TruncatedWideTableCell,
} from "@yaakapp-internal/ui";
import { activeWorkspaceIdAtom } from "../hooks/useActiveWorkspace";
import { createFastMutation } from "../hooks/useFastMutation";
import { hideDialog, showDialog } from "../lib/dialog";
import { jotaiStore } from "../lib/jotai";
import { showPrompt } from "../lib/prompt";
import { resolvedModelNameWithFolders } from "../lib/resolvedModelName";
import { showToast } from "../lib/toast";

export const createFolder = createFastMutation<
  string | null,
  void,
  Partial<Pick<Folder, "name" | "sortPriority" | "folderId">>
>({
  mutationKey: ["create_folder"],
  mutationFn: async (patch) => {
    const workspaceId = jotaiStore.get(activeWorkspaceIdAtom);
    if (workspaceId == null) {
      throw new Error("Cannot create folder when there's no active workspace");
    }

    if (!patch.name) {
      const name = await showPrompt({
        id: "new-folder",
        label: i18n.t("dialog.name"),
        defaultValue: i18n.t("folder.defaultName"),
        title: i18n.t("folder.promptTitle"),
        confirmText: i18n.t("folder.create"),
        placeholder: i18n.t("dialog.name"),
      });
      if (name == null) return null;

      patch.name = name;
    }

    patch.sortPriority = patch.sortPriority || -Date.now();
    const id = await createWorkspaceModel({ model: "folder", workspaceId, ...patch });
    return id;
  },
});

// Files can keep changing under a plan, so stop recalculating after a few stale applies.
const MAX_SYNC_ATTEMPTS = 3;

function showStaleSyncToast() {
  showToast({
    id: "sync-stale",
    color: "warning",
    message: i18n.t("toast.staleSync"),
  });
}

export const syncWorkspace = createFastMutation<
  void,
  void,
  { workspaceId: string; syncDir: string; force?: boolean; attempt?: number }
>({
  mutationKey: [],
  mutationFn: async ({ workspaceId, syncDir, force, attempt = 1 }) => {
    const ops = (await calculateSync(workspaceId, syncDir)) ?? [];
    if (ops.length === 0) {
      console.log("Nothing to sync", workspaceId, syncDir);
      hideDialog("commit-sync");
      return;
    }
    console.log("Syncing workspace", workspaceId, syncDir, ops);

    const dbOps = ops.filter((o) => o.type.startsWith("db"));

    const apply = async () => {
      if (await applySync(workspaceId, syncDir, ops)) {
        hideDialog("commit-sync");
      } else if (attempt < MAX_SYNC_ATTEMPTS) {
        await syncWorkspace.mutateAsync({ workspaceId, syncDir, force, attempt: attempt + 1 });
      } else {
        hideDialog("commit-sync");
        showStaleSyncToast();
      }
    };

    if (dbOps.length === 0 || force) {
      hideDialog("commit-sync");
      await apply();
      return;
    }

    const isDeletingWorkspace = ops.some(
      (o) => o.type === "dbDelete" && o.model.model === "workspace",
    );

    console.log("Directory changes detected", { dbOps, ops });

    if (attempt > 1) {
      showStaleSyncToast();
    }

    showDialog({
      id: "commit-sync",
      title: i18n.t("sync.title"),
      size: "md",
      render: ({ hide }) => (
        <form
          className="h-full grid grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await apply();
          }}
        >
          {isDeletingWorkspace ? (
            <Banner color="danger">
              🚨 <strong>{i18n.t("sync.deletionWarning")}</strong>
            </Banner>
          ) : (
            <span />
          )}
          <p>{i18n.t("sync.changed", { count: dbOps.length })}</p>
          <Table scrollable className="my-4">
            <TableHead>
              <TableRow>
                <TableHeaderCell>{i18n.t("sync.type")}</TableHeaderCell>
                <TableHeaderCell>{i18n.t("dialog.name")}</TableHeaderCell>
                <TableHeaderCell>{i18n.t("sync.operation")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dbOps.map((op, i) => {
                let name: string;
                let label: string;
                let color: string;
                let model: string;

                if (op.type === "dbCreate") {
                  label = i18n.t("sync.opCreate");
                  name = resolvedModelNameWithFolders(op.fs.model);
                  color = "text-success";
                  model = modelTypeLabel(op.fs.model);
                } else if (op.type === "dbUpdate") {
                  label = i18n.t("sync.opUpdate");
                  name = resolvedModelNameWithFolders(op.fs.model);
                  color = "text-info";
                  model = modelTypeLabel(op.fs.model);
                } else if (op.type === "dbDelete") {
                  label = i18n.t("sync.opDelete");
                  name = resolvedModelNameWithFolders(op.model);
                  color = "text-danger";
                  model = modelTypeLabel(op.model);
                } else {
                  return null;
                }

                return (
                  // oxlint-disable-next-line react/no-array-index-key
                  <TableRow key={i}>
                    <TableCell className="text-text-subtle">{model}</TableCell>
                    <TruncatedWideTableCell>{name}</TruncatedWideTableCell>
                    <TableCell className="text-right">
                      <InlineCode className={color}>{label}</InlineCode>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <footer className="py-3 flex flex-row-reverse items-center gap-3">
            <Button type="submit" color="primary">
              {i18n.t("sync.apply")}
            </Button>
            <Button onClick={hide} color="secondary">
              {i18n.t("dialog.cancel")}
            </Button>
          </footer>
        </form>
      ),
    });
  },
});
