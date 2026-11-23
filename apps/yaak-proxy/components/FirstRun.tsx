import { i18n } from "@yaakapp-internal/i18n";
import { Button, Icon, IconTooltip, InlineCode, LoadingIcon } from "@yaakapp-internal/ui";
import classNames from "classnames";
import { useAtomValue } from "jotai";
import type { ReactNode } from "react";
import { useRpcMutation } from "../hooks/useRpcMutation";
import { encryptingPercent } from "../lib/encrypting";
import { proxyStateAtom } from "../lib/store";
import { useCopyEnvironment, useProxySetup, useSystemProxySwitch } from "./ProxyStatus";

type StepState = "todo" | "next" | "wait" | "done" | "fail";

/**
 * The list's empty state until traffic arrives: turn on the system proxy, then see traffic. The
 * certificate is trusted at the first Decrypt, not here, as nothing needs it before. Not
 * dismissable and nothing remembered; the first flow replaces it. Copy environment beside it
 * serves someone who wants one terminal proxied and nothing system-wide.
 */
export function FirstRun() {
  const proxyState = useAtomValue(proxyStateAtom);
  const setup = useProxySetup();
  const { systemProxy, setSystemProxy } = setup;
  const systemSwitch = useSystemProxySwitch(setup);
  const execute = useRpcMutation("execute_action");
  const retry = useRpcMutation("take_over");
  const copyEnvironment = useCopyEnvironment();

  const running = proxyState?.state === "running";
  // Changed only by the process that owns the engine, so not from here while the CLI does.
  const otherOwner = proxyState?.otherOwner != null;
  const recording = proxyState?.recording !== false;
  const systemSupported = systemProxy.data?.supported !== false;
  const systemOn = systemProxy.data?.enabled === true;

  const systemState: StepState = setSystemProxy.isPending
    ? "wait"
    : systemOn
      ? "done"
      : systemSwitch.failed
        ? "fail"
        : "next";
  const ready = systemOn || !systemSupported;
  const encrypting = !running && !otherOwner ? encryptingPercent(proxyState) : null;
  const trafficState: StepState =
    encrypting != null ? "wait" : !running && !otherOwner ? "fail" : ready ? "wait" : "todo";

  return (
    <div className="grid place-items-center h-full px-10 pb-16 pt-6">
      <div className="w-full max-w-[40rem]">
        <div className="text-xl font-semibold mb-1.5">{i18n.t("flows.setUpTitle")}</div>
        <div className="text-text-subtle text-sm leading-relaxed mb-4">
          {systemSupported
            ? i18n.t("flows.everyAppOnMac")
            : i18n.t("flows.trafficAppears")}
        </div>
        <div className="rounded-lg border border-border-subtle bg-surface divide-y divide-border-subtle">
          {systemSupported && (
            <Step
              n={1}
              state={systemState}
              title={systemOn ? i18n.t("flows.systemProxyOverridden") : i18n.t("flows.overrideSystemProxy")}
              description={
                otherOwner && !systemOn
                  ? proxyState?.otherOwner?.owner === "cli"
                    ? i18n.t("flows.takeOverFromCli")
                    : i18n.t("flows.quitOtherProxy")
                  : systemSwitch.description
              }
              action={
                (systemState === "next" || systemState === "fail") && running ? (
                  <Button
                    size="2xs"
                    variant={systemState === "fail" ? "border" : "solid"}
                    color={systemState === "fail" ? "default" : "primary"}
                    onClick={() => setSystemProxy.mutate({ enabled: true })}
                  >
                    {systemState === "fail" ? i18n.t("flows.retry") : i18n.t("flows.enable")}
                  </Button>
                ) : null
              }
            />
          )}
          <Step
            n={systemSupported ? 2 : 1}
            state={trafficState}
            title={
              encrypting != null
                ? i18n.t("flows.encryptingTraffic", { percent: encrypting })
                : trafficState === "wait"
                  ? i18n.t("flows.waitingForTraffic")
                  : i18n.t("flows.seeTraffic")
            }
            description={
              encrypting != null
                ? i18n.t("flows.recordingAfterEncryption")
                : trafficState === "fail"
                  ? (retry.error?.message ?? proxyState?.startError ?? i18n.t("flows.proxyFailedStart"))
                  : !recording
                    ? i18n.t("flows.recordingPaused")
                    : trafficState === "wait"
                      ? i18n.t("flows.openToBegin")
                      : i18n.t("flows.flowsAppear")
            }
            action={
              trafficState === "fail" ? (
                <Button
                  size="2xs"
                  variant="border"
                  isLoading={retry.isPending}
                  onClick={() => retry.mutate({})}
                >
                  {i18n.t("flows.retry")}
                </Button>
              ) : !recording && running ? (
                <Button
                  size="2xs"
                  color="primary"
                  onClick={() => execute.mutate({ scope: "global", action: "recording_toggle" })}
                >
                  {i18n.t("flows.resumeRecording")}
                </Button>
              ) : null
            }
          />
        </div>
        <div className="flex items-center gap-3 mt-4 text-sm text-text-subtle">
          <span>{i18n.t("flows.copyEnvironmentHint")}</span>
          <Button
            size="2xs"
            variant="border"
            className="ml-auto shrink-0"
            leftSlot={<Icon icon="square_terminal" size="sm" />}
            onClick={() => void copyEnvironment()}
          >
            {i18n.t("flows.copyEnvironment")}
          </Button>
        </div>
        <div className="mt-2 text-sm text-text-subtle">
          {i18n.t("flows.agentsMcpPrefix")}<InlineCode>yaak mcp</InlineCode>{i18n.t("flows.agentsMcpSuffix")}
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-sm text-text-subtle">
          {i18n.t("flows.trafficEncrypted")}
          <IconTooltip
            iconSize="sm"
            content={i18n.t("flows.keychainHint")}
          />
        </div>
      </div>
    </div>
  );
}

function Step({
  n,
  state,
  title,
  description,
  action,
}: {
  n: number;
  state: StepState;
  title: string;
  description: ReactNode;
  action: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1.4rem_minmax(0,1fr)_auto] gap-x-3 items-center px-4 py-3">
      <StepMark n={n} state={state} />
      <div className="min-w-0">
        <div className={classNames("text-sm", state === "todo" ? "text-text-subtle" : "text-text")}>
          {title}
        </div>
        <div
          className={classNames(
            "text-xs mt-0.5",
            state === "fail" ? "text-danger" : "text-text-subtle",
          )}
        >
          {description}
        </div>
      </div>
      <div>{action}</div>
    </div>
  );
}

function StepMark({ n, state }: { n: number; state: StepState }) {
  const base = "w-[1.4rem] h-[1.4rem] rounded-full grid place-items-center text-xs";
  switch (state) {
    case "done":
      return (
        <span className={classNames(base, "bg-success/15 text-success")}>
          <Icon icon="check" size="sm" />
        </span>
      );
    case "fail":
      return (
        <span className={classNames(base, "bg-danger/15 text-danger")}>
          <Icon icon="x" size="sm" />
        </span>
      );
    case "wait":
      return (
        <span className={classNames(base, "text-text-subtle")}>
          <LoadingIcon size="sm" />
        </span>
      );
    case "next":
      return <span className={classNames(base, "bg-primary text-white font-semibold")}>{n}</span>;
    case "todo":
      return <span className={classNames(base, "border border-border text-text-subtle")}>{n}</span>;
  }
}
