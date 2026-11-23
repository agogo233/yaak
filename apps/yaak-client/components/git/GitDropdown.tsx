import { useGitBranchInfo, useGitMutations } from "@yaakapp-internal/git";
import type { WorkspaceMeta } from "@yaakapp-internal/models";
import classNames from "classnames";
import { useAtomValue } from "jotai";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { openWorkspaceSettings } from "../../commands/openWorkspaceSettings";
import { activeWorkspaceAtom, activeWorkspaceMetaAtom } from "../../hooks/useActiveWorkspace";
import { useKeyValue } from "../../hooks/useKeyValue";
import { useRandomKey } from "../../hooks/useRandomKey";
import { sync } from "../../init/sync";
import { showConfirm, showConfirmDelete } from "../../lib/confirm";
import { fireAndForget } from "../../lib/fireAndForget";
import { showDialog } from "../../lib/dialog";
import { gitWorktreeStatusAtom } from "../../lib/gitWorktreeStatus";
import { showPrompt } from "../../lib/prompt";
import { showErrorToast, showToast } from "../../lib/toast";
import type { DropdownItem } from "../core/Dropdown";
import { Dropdown } from "../core/Dropdown";
import { Banner, Icon, InlineCode } from "@yaakapp-internal/ui";
import { useGitCallbacks } from "./callbacks";
import { GitCommitDialog } from "./GitCommitDialog";
import { GitRemotesDialog } from "./GitRemotesDialog";
import { handlePullResult, handlePushResult } from "./git-util";
import { HistoryDialog } from "./HistoryDialog";

const EMPTY_BRANCHES: string[] = [];

export function GitDropdown() {
  const workspaceMeta = useAtomValue(activeWorkspaceMetaAtom);
  if (workspaceMeta == null) return null;

  if (workspaceMeta.settingSyncDir == null) {
    return <SetupSyncDropdown workspaceMeta={workspaceMeta} />;
  }

  return <SyncDropdownWithSyncDir syncDir={workspaceMeta.settingSyncDir} />;
}

function SyncDropdownWithSyncDir({ syncDir }: { syncDir: string }) {
  const { t } = useTranslation();
  const workspace = useAtomValue(activeWorkspaceAtom);
  const worktreeStatus = useAtomValue(gitWorktreeStatusAtom);
  const [refreshKey, regenerateKey] = useRandomKey();
  const branchInfo = useGitBranchInfo(syncDir, refreshKey);
  const callbacks = useGitCallbacks(syncDir);
  const {
    createBranch,
    deleteBranch,
    deleteRemoteBranch,
    renameBranch,
    mergeBranch,
    push,
    pull,
    checkout,
    resetChanges,
    init,
  } = useGitMutations(syncDir, callbacks);

  const localBranches = branchInfo.data?.localBranches ?? EMPTY_BRANCHES;
  const remoteBranches = branchInfo.data?.remoteBranches ?? EMPTY_BRANCHES;
  const remoteOnlyBranches = useMemo(
    () => remoteBranches.filter((b) => !localBranches.includes(b.replace(/^origin\//, ""))),
    [localBranches, remoteBranches],
  );
  const currentBranch = branchInfo.data?.headRefShorthand;
  const hasChanges = worktreeStatus?.entries.some((e) => e.status !== "current") ?? false;
  const ahead = branchInfo.data?.ahead ?? 0;
  const behind = branchInfo.data?.behind ?? 0;
  const initRepo = useCallback(() => {
    init.mutate();
  }, [init]);

  const items: DropdownItem[] = useMemo(() => {
    if (workspace == null || branchInfo.data == null) return [];

    const tryCheckout = (branch: string, force: boolean) => {
      checkout.mutate(
        { branch, force },
        {
          disableToastError: true,
          async onError(err) {
            if (!force) {
              // Checkout failed so ask user if they want to force it
              const forceCheckout = await showConfirm({
                id: "git-force-checkout",
                title: t("git.conflictsDetected"),
                description:
                  t("git.conflictsDescription"),
                confirmText: t("git.forceCheckout"),
                color: "warning",
              });
              if (forceCheckout) {
                tryCheckout(branch, true);
              }
            } else {
              // Checkout failed
              showErrorToast({
                id: "git-checkout-error",
                title: t("git.errorCheckingOutBranch"),
                message: String(err),
              });
            }
          },
          async onSuccess(branchName) {
            showToast({
              id: "git-checkout-success",
              message: t("git.switchedBranch", { branch: branchName }),
              color: "success",
            });
            await sync({ force: true });
          },
        },
      );
    };

    return [
      {
        label: t("git.viewHistory"),
        leftSlot: <Icon icon="history" />,
        onSelect: async () => {
          showDialog({
            id: "git-history",
            size: "md",
            title: t("git.commitHistory"),
            noPadding: true,
            render: () => <HistoryDialog dir={syncDir} />,
          });
        },
      },
      {
        label: t("git.manageRemotes"),
        leftSlot: <Icon icon="hard_drive_download" />,
        onSelect: () => GitRemotesDialog.show(syncDir),
      },
      { type: "separator" },
      {
        label: t("git.newBranch"),
        leftSlot: <Icon icon="git_branch_plus" />,
        async onSelect() {
          const name = await showPrompt({
            id: "git-branch-name",
            title: t("git.createBranch"),
            label: t("git.branchName"),
          });
          if (!name) return;

          await createBranch.mutateAsync(
            { branch: name },
            {
              disableToastError: true,
              onError: (err) => {
                showErrorToast({
                  id: "git-branch-error",
                  title: t("git.errorCreatingBranch"),
                  message: String(err),
                });
              },
            },
          );
          tryCheckout(name, false);
        },
      },
      { type: "separator" },
      {
        label: t("git.push"),
        leftSlot: <Icon icon="arrow_up_from_line" />,
        waitForOnSelect: true,
        async onSelect() {
          await push.mutateAsync(undefined, {
            disableToastError: true,
            onSuccess: handlePushResult,
            onError(err) {
              showErrorToast({
                id: "git-push-error",
                title: t("git.errorPushingChanges"),
                message: String(err),
              });
            },
          });
        },
      },
      {
        label: t("git.pull"),
        leftSlot: <Icon icon="arrow_down_to_line" />,
        waitForOnSelect: true,
        async onSelect() {
          await pull.mutateAsync(undefined, {
            disableToastError: true,
            onSuccess: handlePullResult,
            onError(err) {
              showErrorToast({
                id: "git-pull-error",
                title: t("git.errorPullingChanges"),
                message: String(err),
              });
            },
          });
        },
      },
      {
        label: t("git.commit"),

        leftSlot: <Icon icon="git_commit_vertical" />,
        onSelect() {
          showDialog({
            id: "commit",
            title: t("git.commitChanges"),
            size: "full",
            noPadding: true,
            render: ({ hide }) => (
              <GitCommitDialog syncDir={syncDir} onDone={hide} workspace={workspace} />
            ),
          });
        },
      },
      {
        label: t("git.resetChanges"),
        hidden: !hasChanges,
        leftSlot: <Icon icon="rotate_ccw" />,
        color: "danger",
        async onSelect() {
          const confirmed = await showConfirm({
            id: "git-reset-changes",
            title: t("git.resetChanges"),
            description: t("git.resetChangesDescription"),
            confirmText: t("git.reset"),
            color: "danger",
          });
          if (!confirmed) return;

          await resetChanges.mutateAsync(undefined, {
            disableToastError: true,
            onSuccess() {
              showToast({
                id: "git-reset-success",
                message: t("git.changesHaveBeenReset"),
                color: "success",
              });
              fireAndForget(sync({ force: true }));
            },
            onError(err) {
              showErrorToast({
                id: "git-reset-error",
                title: t("git.errorResettingChanges"),
                message: String(err),
              });
            },
          });
        },
      },
      { type: "separator", label: t("git.branches"), hidden: localBranches.length < 1 },
      ...localBranches.map((branch) => {
        const isCurrent = currentBranch === branch;
        return {
          label: branch,
          leftSlot: <Icon icon={isCurrent ? "check" : "empty"} />,
          submenuOpenOnClick: true,
          submenu: [
            {
              label: t("git.checkout"),
              hidden: isCurrent,
              onSelect: () => tryCheckout(branch, false),
            },
            {
              label: t("git.mergeInto", { branch: currentBranch }),
              hidden: isCurrent,
              async onSelect() {
                await mergeBranch.mutateAsync(
                  { branch },
                  {
                    disableToastError: true,
                    onSuccess() {
                      showToast({
                        id: "git-merged-branch",
                        message: t("git.mergedInto", { branch, target: currentBranch }),
                      });
                      fireAndForget(sync({ force: true }));
                    },
                    onError(err) {
                      showErrorToast({
                        id: "git-merged-branch-error",
                        title: t("git.errorMergingBranch"),
                        message: String(err),
                      });
                    },
                  },
                );
              },
            },
            {
              label: t("git.newBranch"),
              async onSelect() {
                const name = await showPrompt({
                  id: "git-new-branch-from",
                  title: t("git.newBranchTitle"),
                  description: t("git.createNewBranchFrom", { branch }),
                  label: t("git.branchName"),
                });
                if (!name) return;

                await createBranch.mutateAsync(
                  { branch: name, base: branch },
                  {
                    disableToastError: true,
                    onError: (err) => {
                      showErrorToast({
                        id: "git-branch-error",
                        title: t("git.errorCreatingBranch"),
                        message: String(err),
                      });
                    },
                  },
                );
                tryCheckout(name, false);
              },
            },
            {
              label: t("git.rename"),
              async onSelect() {
                const newName = await showPrompt({
                  id: "git-rename-branch",
                  title: t("git.renameBranch"),
                  label: t("git.newBranchName"),
                  defaultValue: branch,
                });
                if (!newName || newName === branch) return;

                await renameBranch.mutateAsync(
                  { oldName: branch, newName },
                  {
                    disableToastError: true,
                    onSuccess() {
                      showToast({
                        id: "git-rename-branch-success",
                        message: t("git.renamedTo", { branch, newName }),
                        color: "success",
                      });
                    },
                    onError(err) {
                      showErrorToast({
                        id: "git-rename-branch-error",
                        title: t("git.errorRenamingBranch"),
                        message: String(err),
                      });
                    },
                  },
                );
              },
            },
            { type: "separator", hidden: isCurrent },
            {
              label: t("git.delete"),
              color: "danger",
              hidden: isCurrent,
              onSelect: async () => {
                const confirmed = await showConfirmDelete({
                  id: "git-delete-branch",
                  title: t("git.deleteBranch"),
                  description: t("git.permanentlyDelete", { branch }),
                });
                if (!confirmed) {
                  return;
                }

                const result = await deleteBranch.mutateAsync(
                  { branch },
                  {
                    disableToastError: true,
                    onError(err) {
                      showErrorToast({
                        id: "git-delete-branch-error",
                        title: t("git.errorDeletingBranch"),
                        message: String(err),
                      });
                    },
                  },
                );

                if (result.type === "not_fully_merged") {
                  const confirmed = await showConfirm({
                    id: "force-branch-delete",
                    title: t("git.branchNotFullyMerged"),
                    description: (
                      <>
                        <p>{t("git.branchNotFullyMergedDesc", { branch })}</p>
                        <p>{t("git.deleteAnyway")}</p>
                      </>
                    ),
                  });
                  if (confirmed) {
                    await deleteBranch.mutateAsync(
                      { branch, force: true },
                      {
                        disableToastError: true,
                        onError(err) {
                          showErrorToast({
                            id: "git-force-delete-branch-error",
                            title: t("git.errorForceDeletingBranch"),
                            message: String(err),
                          });
                        },
                      },
                    );
                  }
                }
              },
            },
          ],
        } satisfies DropdownItem;
      }),
      ...remoteOnlyBranches.map((branch) => {
        const isCurrent = currentBranch === branch;
        return {
          label: branch,
          leftSlot: <Icon icon={isCurrent ? "check" : "empty"} />,
          submenuOpenOnClick: true,
          submenu: [
            {
              label: t("git.checkout"),
              hidden: isCurrent,
              onSelect: () => tryCheckout(branch, false),
            },
            {
              label: t("git.delete"),
              color: "danger",
              async onSelect() {
                const confirmed = await showConfirmDelete({
                  id: "git-delete-remote-branch",
                  title: t("git.deleteRemoteBranch"),
                  description: t("git.permanentlyDeleteFromRemote", { branch }),
                });
                if (!confirmed) return;

                await deleteRemoteBranch.mutateAsync(
                  { branch },
                  {
                    disableToastError: true,
                    onSuccess() {
                      showToast({
                        id: "git-delete-remote-branch-success",
                        message: t("git.deletedRemoteBranch", { branch }),
                        color: "success",
                      });
                    },
                    onError(err) {
                      showErrorToast({
                        id: "git-delete-remote-branch-error",
                        title: t("git.errorDeletingRemoteBranch"),
                        message: String(err),
                      });
                    },
                  },
                );
              },
            },
          ],
        } satisfies DropdownItem;
      }),
    ];
  }, [
    branchInfo.data,
    checkout,
    createBranch,
    currentBranch,
    deleteBranch,
    deleteRemoteBranch,
    hasChanges,
    localBranches,
    mergeBranch,
    pull,
    push,
    remoteOnlyBranches,
    renameBranch,
    resetChanges,
    syncDir,
    t,
    workspace,
  ]);

  if (workspace == null) {
    return null;
  }

  const noRepo = branchInfo.error?.includes("not found");
  if (noRepo) {
    return <SetupGitDropdown workspaceId={workspace.id} initRepo={initRepo} />;
  }

  // Still loading
  if (branchInfo.data == null) {
    return null;
  }

  return (
    <Dropdown fullWidth items={items} onOpen={regenerateKey}>
      <GitMenuButton>
        <InlineCode className="flex items-center gap-1">
          <Icon icon="git_branch" size="xs" className="opacity-50" />
          {currentBranch}
        </InlineCode>
        <div className="flex items-center gap-1.5">
          {ahead > 0 && (
            <span className="text-xs flex items-center gap-0.5">
              <span className="text-primary">↗</span>
              {ahead}
            </span>
          )}
          {behind > 0 && (
            <span className="text-xs flex items-center gap-0.5">
              <span className="text-info">↙</span>
              {behind}
            </span>
          )}
        </div>
      </GitMenuButton>
    </Dropdown>
  );
}

const GitMenuButton = forwardRef<HTMLButtonElement, HTMLAttributes<HTMLButtonElement>>(
  function GitMenuButton({ className, ...props }: HTMLAttributes<HTMLButtonElement>, ref) {
    return (
      <button
        ref={ref}
        className={classNames(
          className,
          "px-3 h-md border-t border-border flex items-center justify-between text-text-subtle outline-hidden focus-visible:bg-surface-highlight",
        )}
        {...props}
      />
    );
  },
);

function SetupSyncDropdown({ workspaceMeta }: { workspaceMeta: WorkspaceMeta }) {
  const { t } = useTranslation();
  const { value: hidden, set: setHidden } = useKeyValue<Record<string, boolean>>({
    key: "setup_sync",
    fallback: {},
  });

  if (hidden == null || hidden[workspaceMeta.workspaceId]) {
    return null;
  }

  const banner = <Banner color="info">{t("git.syncBanner")}</Banner>;

  return (
    <Dropdown
      fullWidth
      items={[
        {
          type: "content",
          label: banner,
        },
        {
          color: "success",
          label: t("git.openWorkspaceSettings"),
          leftSlot: <Icon icon="settings" />,
          onSelect: () => openWorkspaceSettings("settings"),
        },
        { type: "separator" },
        {
          label: t("git.hideThisMessage"),
          leftSlot: <Icon icon="eye_closed" />,
          async onSelect() {
            const confirmed = await showConfirm({
              id: "hide-sync-menu-prompt",
              title: t("git.hideSetupMessage"),
              description: t("git.setupSyncDescription"),
            });
            if (confirmed) {
              await setHidden((prev) => ({ ...prev, [workspaceMeta.workspaceId]: true }));
            }
          },
        },
      ]}
    >
      <GitMenuButton>
        <div className="text-sm text-text-subtle grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
          <Icon icon="wrench" />
          <div className="truncate">{t("git.setupFsSyncOrGit")}</div>
        </div>
      </GitMenuButton>
    </Dropdown>
  );
}

function SetupGitDropdown({
  workspaceId,
  initRepo,
}: {
  workspaceId: string;
  initRepo: () => void;
}) {
  const { t } = useTranslation();
  const { value: hidden, set: setHidden } = useKeyValue<Record<string, boolean>>({
    key: "setup_git_repo",
    fallback: {},
  });

  if (hidden == null || hidden[workspaceId]) {
    return null;
  }

  const banner = <Banner color="info">{t("git.initRepoBanner")}</Banner>;

  return (
    <Dropdown
      fullWidth
      items={[
        { type: "content", label: banner },
        {
          label: t("git.initializeGitRepo"),
          leftSlot: <Icon icon="magic_wand" />,
          onSelect: initRepo,
        },
        { type: "separator" },
        {
          label: t("git.hideThisMessage"),
          leftSlot: <Icon icon="eye_closed" />,
          async onSelect() {
            const confirmed = await showConfirm({
              id: "hide-git-init-prompt",
              title: t("git.hideGitSetup"),
              description: t("git.initOutsideYaak"),
            });
            if (confirmed) {
              await setHidden((prev) => ({ ...prev, [workspaceId]: true }));
            }
          },
        },
      ]}
    >
      <GitMenuButton>
        <div className="text-sm text-text-subtle grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
          <Icon icon="folder_git" />
          <div className="truncate">{t("git.setupGit")}</div>
        </div>
      </GitMenuButton>
    </Dropdown>
  );
}
