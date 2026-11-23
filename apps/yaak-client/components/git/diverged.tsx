import type { DivergedStrategy } from "@yaakapp-internal/git";
import { i18n } from "@yaakapp-internal/i18n";
import { InlineCode } from "@yaakapp-internal/ui";
import { useState } from "react";
import { showDialog } from "../../lib/dialog";
import { DialogFooter } from "../core/Dialog";
import { RadioCards } from "../core/RadioCards";

type Resolution = "force_reset" | "merge";

const resolutionLabelKey: Record<Resolution, string> = {
  force_reset: "git.forcePull",
  merge: "git.merge",
};

interface DivergedDialogProps {
  remote: string;
  branch: string;
  onResult: (strategy: DivergedStrategy) => void;
  onHide: () => void;
}

function DivergedDialog({ remote, branch, onResult, onHide }: DivergedDialogProps) {
  const [selected, setSelected] = useState<Resolution | null>(null);

  const handleSubmit = () => {
    if (selected == null) return;
    onResult(selected);
    onHide();
  };

  const handleCancel = () => {
    onResult("cancel");
    onHide();
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-text-subtle">
        {i18n.t("git.divergedPrefix")}{" "}
        <InlineCode>
          {remote}/{branch}
        </InlineCode>
        {i18n.t("git.divergedSuffix")}
      </p>
      <RadioCards
        name="diverged-strategy"
        value={selected}
        onChange={setSelected}
        options={[
          {
            value: "merge",
            label: i18n.t("git.mergeCommit"),
            description: i18n.t("git.mergeCommitDescription"),
          },
          {
            value: "force_reset",
            label: i18n.t("git.forcePull"),
            description: i18n.t("git.forcePullDescription"),
          },
        ]}
      />
      <DialogFooter
        inline
        actions={[
          { label: i18n.t("dialog.cancel"), onClick: handleCancel },
          {
            label: selected != null ? i18n.t(resolutionLabelKey[selected]) : i18n.t("git.selectAnOption"),
            color: selected === "force_reset" ? "danger" : "primary",
            disabled: selected == null,
            onClick: handleSubmit,
          },
        ]}
      />
    </div>
  );
}

export async function promptDivergedStrategy({
  remote,
  branch,
}: {
  remote: string;
  branch: string;
}): Promise<DivergedStrategy> {
  return new Promise((resolve) => {
    showDialog({
      id: "git-diverged",
      title: i18n.t("git.branchesDiverged"),
      size: "sm",
      disableClose: true,
      render: ({ hide }) =>
        DivergedDialog({
          remote,
          branch,
          onHide: hide,
          onResult: resolve,
        }),
    });
  });
}
