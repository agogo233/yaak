import { i18n } from "@yaakapp-internal/i18n";
import type {
  DropReason,
  Flow,
  FolderSummary,
  WorkspaceSummary,
} from "@yaakapp-internal/proxy-lib";
import {
  Banner,
  CONTROL_TOOLTIP_DELAY,
  Dialog,
  DialogFooter,
  HttpMethodTagRaw,
  LoadingIcon,
  PlainInput,
  Tooltip,
} from "@yaakapp-internal/ui";
import { unnamedRequestName } from "@yaakapp-internal/ui/resolvedModelName";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "react-use";
import { useRpcMutation } from "../hooks/useRpcMutation";
import { useRpcQuery } from "../hooks/useRpcQuery";
import { exportHar, saveDialogFlowAtom } from "../lib/flowActions";
import { useShowToast } from "../lib/toast";

const DOWNLOAD_URL = "https://yaak.app/download";
const SAVE_FORM_ID = "save-flow-to-yaak";

/** Save as Yaak request, for the flow in `saveDialogFlowAtom` */
export function SaveDialog() {
  const [flow, setFlow] = useAtom(saveDialogFlowAtom);
  const workspaces = useRpcQuery("list_workspaces", {}, { enabled: flow != null, staleTime: 0 });
  const close = () => setFlow(null);

  if (flow == null) return null;
  if (workspaces.data?.yaakFound === false) return <NoYaakDialog flow={flow} onClose={close} />;
  return (
    <Dialog
      open
      onClose={close}
      size="dynamic"
      title={i18n.t("flows.saveAsRequest")}
      description={i18n.t("flows.saveAsRequestDesc")}
      className="w-[36rem]"
    >
      {workspaces.error != null ? (
        <Banner color="danger">{workspaces.error.message}</Banner>
      ) : workspaces.data == null ? (
        <LoadingIcon />
      ) : (
        <SaveForm flow={flow} workspaces={workspaces.data.workspaces} onClose={close} />
      )}
    </Dialog>
  );
}

function SaveForm({
  flow,
  workspaces,
  onClose,
}: {
  flow: Flow;
  workspaces: WorkspaceSummary[];
  onClose: () => void;
}) {
  const showToast = useShowToast();
  const preview = useRpcQuery("preview_save", { flowId: flow.id }, { staleTime: 0 });
  const [lastWorkspaceId, setLastWorkspaceId] = useLocalStorage<string>("save_workspace_id");
  const [workspaceId, setWorkspaceId] = useState(
    workspaces.find((w) => w.id === lastWorkspaceId)?.id ?? workspaces[0]?.id ?? "",
  );
  const [folderId, setFolderId] = useState("");
  const [name, setName] = useState("");
  const save = useRpcMutation("save_flow");

  const workspace = workspaces.find((w) => w.id === workspaceId);
  const folders = useMemo(() => folderOptions(workspace?.folders ?? []), [workspace]);
  useEffect(() => setFolderId(""), [workspaceId]);

  const p = preview.data;
  // Unnamed unless one is typed, as Yaak leaves a new request, which then shows its URL.
  const unnamed =
    p == null
      ? ""
      : unnamedRequestName({ model: "http_request", url: p.requestUrl, bodyType: p.bodyType });
  const folderName = folders.find((f) => f.id === folderId)?.name;

  const submit = () => {
    if (workspace == null) return;
    save.mutate(
      {
        flowId: flow.id,
        workspaceId: workspace.id,
        ...(folderId === "" ? {} : { folderId }),
        ...(name.trim() === "" ? {} : { name }),
      },
      {
        onSuccess: (saved) => {
          setLastWorkspaceId(workspace.id);
          onClose();
          showToast({
            message: (
              <>
                {i18n.t("flows.savedPrefix")}{" "}
                <b className="font-semibold">{saved.name || unnamed}</b>{" "}
                {i18n.t("flows.savedTo")} {workspace.name}
                {folderName == null ? "" : i18n.t("flows.savedIn", { folder: folderName })}
              </>
            ),
          });
        },
      },
    );
  };

  if (workspaces.length === 0) {
    return <Banner color="notice">{i18n.t("flows.createWorkspaceFirst")}</Banner>;
  }

  if (p == null) {
    return preview.error != null ? (
      <Banner color="danger">{preview.error.message}</Banner>
    ) : (
      <LoadingIcon />
    );
  }

  return (
    <form
      id={SAVE_FORM_ID}
      className="flex flex-col gap-3.5 pb-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex items-center gap-3 h-sm px-2.5 rounded-md border border-border-subtle font-mono text-sm min-w-0">
        <HttpMethodTagRaw method={flow.method} colored />
        <span className="truncate text-text">{flow.url}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={i18n.t("flows.workspace")}>
          <select
            className={inputClasses}
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={i18n.t("flows.folder")}>
          <select
            className={inputClasses}
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
          >
            <option value="">{i18n.t("flows.noFolder")}</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <PlainInput label={i18n.t("flows.nameField")} autoFocus defaultValue="" placeholder={unnamed} onChange={setName} />
      {p.droppedHeaders.length > 0 && (
        <div className="rounded-md border border-border-subtle px-3.5 py-2.5">
          <div className="text-sm text-text">
            {p.droppedHeaders.length === 1
              ? i18n.t("flows.headerLeftOutOne")
              : i18n.t("flows.headersLeftOutMany", { count: p.droppedHeaders.length })}{" "}
            <span className="text-text-subtlest text-xs">
              {droppedSummary(p.droppedHeaders.map((h) => h.reason))}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {p.droppedHeaders.map((h) => (
              <Tooltip
                key={h.name}
                wrap
                content={`${h.name}: ${h.value}\n${reasonLabel(h.reason)}`}
                delay={CONTROL_TOOLTIP_DELAY}
              >
                <span className="font-mono text-xs leading-[22px] px-1.5 rounded-sm border border-border-subtle text-text-subtle line-through decoration-text-subtlest">
                  {h.name}
                </span>
              </Tooltip>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-1.5 text-sm">
        <span className="text-text-subtle">{i18n.t("flows.keptLabel")}</span>
        <span>
          {p.keptHeaders === 1
            ? i18n.t("flows.keptOne")
            : i18n.t("flows.keptMany", { count: p.keptHeaders })}
          {p.body == null ? i18n.t("flows.andNoBody") : i18n.t("flows.andBodyAs", { body: p.body })}
        </span>
        {p.warnings.map((w) => (
          <NoteRow key={w} warning={w} authorization={p.authorization} />
        ))}
      </div>
      {save.error != null && <Banner color="danger">{save.error.message}</Banner>}
      <DialogFooter
        actions={[
          { label: i18n.t("common.cancel"), onClick: onClose },
          {
            label: i18n.t("flows.saveRequestBtn"),
            form: SAVE_FORM_ID,
            color: "primary",
            isLoading: save.isPending,
            disabled: workspace == null,
          },
        ]}
      />
    </form>
  );
}

function NoteRow({ warning, authorization }: { warning: string; authorization: boolean }) {
  const flagged = authorization && warning.includes("Authorization");
  return (
    <>
      <span className="text-text-subtle">{i18n.t("flows.noteLabel")}</span>
      <span className={flagged ? "text-notice" : "text-text-subtle"}>{warning}</span>
    </>
  );
}

/** Without Yaak there is nothing to save into: say so, and offer HAR as a way to keep the flow */
function NoYaakDialog({ flow, onClose }: { flow: Flow; onClose: () => void }) {
  const showToast = useShowToast();
  return (
    <Dialog open onClose={onClose} size="dynamic" className="w-[32rem]">
      <DialogFooter
        leftSlot={
          <span className="text-xs text-text-subtlest">
            {i18n.t("flows.exportAsFileInstead")}
          </span>
        }
        actions={[
          {
            label: i18n.t("flows.exportAsHar"),
            onClick: async () => {
              try {
                if ((await exportHar({ ids: [flow.id] }, "flow.har")) != null) {
                  onClose();
                  showToast({ message: i18n.t("flows.exportedHar") });
                }
              } catch (err) {
                showToast({ message: i18n.t("flows.failedExportHar", { error: String(err) }), color: "danger" });
              }
            },
          },
          { label: i18n.t("flows.downloadYaak"), color: "primary", onClick: () => void openUrl(DOWNLOAD_URL) },
        ]}
      />
      <div className="pt-6 pb-2">
        <div className="text-lg font-semibold mb-1.5">{i18n.t("flows.yaakRequired")}</div>
        <div className="text-sm text-text-subtle leading-relaxed">
          {i18n.t("flows.yaakRequiredDesc")}
        </div>
      </div>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // oxlint-disable-next-line jsx-a11y/label-has-associated-control -- wraps its control
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-xs text-text-subtle">{label}</span>
      {children}
    </label>
  );
}

const inputClasses =
  "h-sm w-full min-w-0 px-2 rounded-md border border-border bg-surface text-text text-sm outline-hidden focus:border-border-focus";

/** Folders by their path within the workspace, "Stripe / Payments", in path order */
function folderOptions(folders: FolderSummary[]): { id: string; name: string }[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const pathOf = (f: FolderSummary): string => {
    const names = [f.name];
    const seen = new Set([f.id]);
    let parent = f.folderId == null ? undefined : byId.get(f.folderId);
    while (parent != null && !seen.has(parent.id)) {
      names.unshift(parent.name);
      seen.add(parent.id);
      parent = parent.folderId == null ? undefined : byId.get(parent.folderId);
    }
    return names.join(" / ");
  };
  return folders
    .map((f) => ({ id: f.id, name: pathOf(f) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function reasonLabel(reason: DropReason): string {
  switch (reason) {
    case "set_by_sending":
      return i18n.t("flows.reasonSetBySending");
    case "hop_by_hop":
      return i18n.t("flows.reasonHopByHop");
    case "body_decoded":
      return i18n.t("flows.reasonBodyDecoded");
  }
}

function droppedSummary(reasons: DropReason[]): string {
  const unique = [...new Set(reasons)];
  if (unique.length === 1 && unique[0] === "set_by_sending") {
    return i18n.t("flows.droppedSummaryOne");
  }
  return i18n.t("flows.droppedSummaryMany");
}
