import { useQueryClient } from "@tanstack/react-query";
import { i18n } from "@yaakapp-internal/i18n";
import type { SystemProxyStatus } from "@yaakapp-internal/proxy-lib";
import {
  Button,
  Checkbox,
  Dropdown,
  type DropdownItem,
  type DropdownRef,
  Icon,
  LoadingIcon,
} from "@yaakapp-internal/ui";
import classNames from "classnames";
import { useAtom, useAtomValue } from "jotai";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { useEffect, useRef, useState } from "react";
import { canTrustHere, useDecrypt, useTrustCertificate } from "../hooks/useDecrypt";
import { useDecryptList } from "../hooks/useDecryptList";
import { useRpcEvent } from "../hooks/useRpcEvent";
import { useRpcMutation } from "../hooks/useRpcMutation";
import { useRpcQuery } from "../hooks/useRpcQuery";
import { helperRegisteredAtAtom } from "../lib/atoms";
import { decryptsAnything, decryptsEverything, everythingEdit, listSummary } from "../lib/decrypt";
import { encryptingPercent } from "../lib/encrypting";
import { environmentExports } from "../lib/env";
import { proxyStatusOf } from "../lib/proxyStatus";
import { proxyStateAtom, systemProxyEverOnAtom } from "../lib/store";
import { helperPollInterval, recordingLabel, systemProxySwitch } from "../lib/systemProxy";
import { onWindowFocus } from "../lib/tauri";
import { useShowToast } from "../lib/toast";

/**
 * The header's state pill and its menu: the listening address, which copies itself, the state,
 * Pause or Resume Recording, Override system proxy, and Decrypt everything. The engine runs for
 * as long as the app does, so the pill shows whether flows are being stored. A certificate that
 * is not trusted while something is listed to decrypt steps out of the menu beside the pill
 * until it is. Everything set once and left alone lives in Settings.
 */
export function ProxyStatus() {
  const dropdownRef = useRef<DropdownRef>(null);
  const [copied, setCopied] = useCopied();
  const proxyState = useAtomValue(proxyStateAtom);
  const setup = useProxySetup();
  const execute = useRpcMutation("execute_action");
  const retry = useRpcMutation("take_over");
  const { caStatus, systemProxy, setSystemProxy } = setup;
  const systemSwitch = useSystemProxySwitch(setup);

  const running = proxyState?.state === "running";
  const recording = proxyState?.recording !== false;
  const other = proxyState?.otherOwner ?? null;
  const port = proxyState?.port ?? other?.proxyPort ?? null;
  const decryptList = useDecryptList();
  // Something is listed to decrypt but the certificate isn't trusted, so it can't be.
  // Only where the app can trust it itself: elsewhere the status always reads untrusted.
  const broken =
    canTrustHere() &&
    caStatus.data != null &&
    !caStatus.data.trusted &&
    decryptsAnything(decryptList);
  // The same status the header's tint takes its colour from
  const status = proxyStatusOf(proxyState);
  const encrypting = status === "encrypting" ? encryptingPercent(proxyState) : null;

  const stateRow =
    status === "encrypting" ? (
      <MenuRow
        icon={<LoadingIcon size="sm" className="text-text-subtle" />}
        title={i18n.t("flows.encryptingTraffic", { percent: encrypting })}
        description={i18n.t("flows.recordingAfterEncryption")}
      />
    ) : status === "cli" && other != null ? (
      <MenuRow
        icon={<StateDot state="cli" />}
        title={i18n.t("flows.runningFromCli")}
        description={i18n.t("flows.startedByCli", { time: timeOf(other.startedAt) })}
      />
    ) : status === "recording" || status === "paused" ? (
      <MenuRow
        icon={<StateDot state={status} />}
        title={recording ? i18n.t("flows.recordingOnPort", { port }) : i18n.t("flows.pausedOnPort", { port })}
        description={recording ? null : i18n.t("flows.trafficPassesThrough")}
      />
    ) : (
      <MenuRow
        icon={<Icon icon="alert_triangle" size="sm" color="warning" />}
        title={i18n.t("flows.notRunning")}
        description={
          <span className="text-danger">
            {retry.error?.message ?? proxyState?.startError ?? i18n.t("flows.proxyFailedStart")}
          </span>
        }
        action={
          <Button
            size="2xs"
            variant="border"
            isLoading={retry.isPending}
            onClick={(e) => {
              e.stopPropagation();
              retry.mutate({});
            }}
          >
            Retry
          </Button>
        }
      />
    );

  // Until the helper is approved, every change asks for the password; said where it is felt.
  const helperNotice =
    systemProxy.data != null &&
    systemProxy.data.backend !== "helper" &&
    systemProxy.data.helper !== "enabled" &&
    systemProxy.data.helper !== "unavailable";

  const address = port == null ? null : `127.0.0.1:${port}`;
  const items: DropdownItem[] = [
    {
      label: <span className="font-mono text-editor">{address}</span>,
      hidden: address == null,
      keepOpenOnSelect: true,
      rightSlot: copied ? (
        <span className="text-xs text-text-subtle">{i18n.t("flows.copied")}</span>
      ) : (
        <Icon icon="copy" size="sm" className="text-text-subtlest" />
      ),
      onSelect: () => {
        if (address == null) return;
        navigator.clipboard.writeText(address).then(setCopied, console.error);
      },
    },
    { type: "separator", hidden: address == null },
    { type: "content", label: stateRow },
    {
      label: recordingLabel(recording),
      icon: recording ? "circle_pause" : "circle_play",
      hidden: !running,
      hotKeyAction: "recording_toggle",
      hotKeyLabelOnly: true,
      onSelect: () => execute.mutate({ scope: "global", action: "recording_toggle" }),
    },
    { type: "separator" },
    {
      type: "content",
      hidden: systemProxy.data?.supported !== true,
      label: (
        <MenuRow
          icon={<Icon icon="wifi" size="sm" color="secondary" />}
          title={i18n.t("flows.overrideSystemProxy")}
          description={
            <>
              <span className={classNames(systemSwitch.failed && "text-danger")}>
                {systemSwitch.description}
              </span>
              {helperNotice && (
                <span className="block text-notice">{i18n.t("flows.macosPasswordEachTime")}</span>
              )}
            </>
          }
          action={
            <KeepMenuOpen>
              <Checkbox
                title={i18n.t("flows.overrideSystemProxy")}
                hideLabel
                checked={systemSwitch.checked}
                // Only the process that owns the engine routes to it.
                disabled={!running || other != null || setSystemProxy.isPending}
                onChange={(enabled) => setSystemProxy.mutate({ enabled })}
              />
            </KeepMenuOpen>
          }
        />
      ),
    },
    { type: "content", label: <DecryptEverythingRow broken={broken} /> },
  ];

  return (
    <>
      <Dropdown ref={dropdownRef} items={items}>
        <Pill color={status === "stopped" ? "warning" : undefined}>
          {status === "encrypting" ? (
            <>
              <LoadingIcon size="xs" />
              <span className="text-text">Encrypting</span>
              <span className="font-mono text-text-subtle">{encrypting}</span>
            </>
          ) : status === "cli" && other != null ? (
            <>
              <StateDot state="cli" />
              <span className="text-text">CLI</span>
            </>
          ) : status === "recording" || status === "paused" ? (
            <>
              <StateDot state={status} />
              <span className="text-text">{recording ? "Recording" : "Paused"}</span>
            </>
          ) : (
            <>
              <Icon icon="alert_triangle" size="xs" />
              Not running
            </>
          )}
          <Icon icon="chevron_down" size="xs" className="text-text-subtlest" />
        </Pill>
      </Dropdown>
      {broken && (
        <Pill color="warning" onClick={() => dropdownRef.current?.open()}>
          <Icon icon="shield_off" size="xs" />
          Certificate not trusted
        </Pill>
      )}
    </>
  );
}

/**
 * Decrypt everything, `*` on the list, as a switch: what else is listed when off, and Trust
 * while something is listed and the certificate isn't trusted.
 */
function DecryptEverythingRow({ broken }: { broken: boolean }) {
  const list = useDecryptList();
  const { apply, trusting } = useDecrypt();
  const trust = useTrustCertificate();
  const on = decryptsEverything(list);
  if (broken) {
    return (
      <MenuRow
        icon={<Icon icon="shield_off" size="sm" color="warning" />}
        title={i18n.t("flows.decryptEverything")}
        description={<span className="text-warning">{i18n.t("flows.certificateNotTrusted")}</span>}
        action={
          <Button
            size="2xs"
            color="primary"
            isLoading={trusting}
            onClick={(e) => {
              e.stopPropagation();
              trust.mutate({});
            }}
          >
            {trusting ? i18n.t("flows.waitingForMacos") : i18n.t("flows.trust")}
          </Button>
        }
      />
    );
  }
  return (
    <MenuRow
      icon={<Icon icon="lock_open" size="sm" color="secondary" />}
      title={i18n.t("flows.decryptEverything")}
      description={
        trusting
          ? i18n.t("flows.waitingForMacos")
          : on
            ? i18n.t("flows.excludedStayEncrypted")
            : (listSummary(list) ?? i18n.t("flows.noHostsOrApps"))
      }
      action={
        <KeepMenuOpen>
          <Checkbox
            title={i18n.t("flows.decryptEverything")}
            hideLabel
            checked={on}
            disabled={trusting}
            onChange={(checked) =>
              void apply(
                checked
                  ? {
                      edit: everythingEdit(true),
                      message: i18n.t("flows.decryptingEverything"),
                      sub: i18n.t("flows.excludedStayEncrypted"),
                    }
                  : {
                      edit: everythingEdit(false),
                      message: i18n.t("flows.stoppedDecryptingEverything"),
                    },
              )
            }
          />
        </KeepMenuOpen>
      }
    />
  );
}

/**
 * The certificate and the system proxy, read once and shared by the header and the first-run
 * card, with the actions that change them.
 */
export function useProxySetup() {
  const queryClient = useQueryClient();
  const caStatus = useRpcQuery("ca_status", {});
  const registeredAt = useAtomValue(helperRegisteredAtAtom);
  const systemProxy = useRpcQuery(
    "system_proxy_status",
    {},
    {
      // The helper is approved in System Settings, out of the app's sight.
      refetchInterval: (query) =>
        helperPollInterval(query.state.data?.helper, registeredAt, Date.now()),
    },
  );
  // The user comes back from System Settings, maybe having just allowed the helper.
  const { refetch: refetchSystemProxy } = systemProxy;
  useEffect(() => onWindowFocus(() => void refetchSystemProxy()), [refetchSystemProxy]);
  const setSystemProxy = useRpcMutation("system_proxy_set", {
    mutationKey: ["system_proxy_set"],
    onSuccess: (status) => {
      queryClient.setQueryData<SystemProxyStatus>(["system_proxy_status", {}], status);
    },
  });
  // The engine turns the system proxy on as it starts, and says so once the prompt is
  // answered, and turns it off as it stops.
  useRpcEvent("proxy_state_changed", () => void systemProxy.refetch());
  // Setup counts as done once the system proxy has been on, whatever it is now.
  const [everOn, setEverOn] = useAtom(systemProxyEverOnAtom);
  const on = systemProxy.data?.enabled === true;
  useEffect(() => {
    if (on && !everOn) setEverOn(true);
  }, [on, everOn, setEverOn]);
  return { caStatus, systemProxy, setSystemProxy };
}

/** The system proxy switch's state, from where it points and the change in flight */
export function useSystemProxySwitch(setup: ReturnType<typeof useProxySetup>) {
  const proxyState = useAtomValue(proxyStateAtom);
  const { systemProxy, setSystemProxy } = setup;
  return systemProxySwitch({
    routing: systemProxy.data?.enabled === true,
    port: proxyState?.port ?? proxyState?.configuredPort ?? null,
    pending: setSystemProxy.isPending ? (setSystemProxy.variables?.enabled ?? null) : null,
    error: setSystemProxy.error?.message ?? null,
    helper: systemProxy.data?.backend === "helper",
  });
}

/** The privileged helper: whether it is installed and approved, and which way changes go */
export function useCopyEnvironment() {
  const proxyState = useAtomValue(proxyStateAtom);
  const caStatus = useRpcQuery("ca_status", {});
  const showToast = useShowToast();
  return async () => {
    const port =
      proxyState?.port ?? proxyState?.otherOwner?.proxyPort ?? proxyState?.configuredPort;
    const caPath = caStatus.data?.certPath;
    if (port == null || caPath == null) return;
    try {
      await navigator.clipboard.writeText(environmentExports(port, caPath));
      showToast({
        message: i18n.t("flows.copiedEnvironment"),
      });
    } catch (err) {
      showToast({ message: i18n.t("flows.failedCopy", { error: String(err) }), color: "danger" });
    }
  };
}

/** Whether something was just copied, for a moment, and the call that says it was */
function useCopied(): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timeout);
  }, [copied]);
  return [copied, () => setCopied(true)];
}

/** Keeps a click on a control inside a menu row from closing the menu, as a row's click does */
function KeepMenuOpen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- only stops the click reaching the row
    <span className={className} onClick={(e) => e.stopPropagation()}>
      {children}
    </span>
  );
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

interface PillProps extends HTMLAttributes<HTMLButtonElement> {
  color?: "warning";
  ref?: Ref<HTMLButtonElement>;
}

function Pill({ children, color, ref, ...props }: PillProps) {
  return (
    <button
      {...props}
      ref={ref}
      type="button"
      className={classNames(
        "pointer-events-auto flex items-center gap-1.5 h-[1.45rem] px-2.5 rounded-full border text-xs",
        "whitespace-nowrap outline-hidden focus-visible:ring-1 ring-border-focus",
        color === "warning"
          ? "border-warning/50 text-warning hover:bg-warning/10"
          : "border-border-subtle text-text-subtle hover:bg-surface-highlight",
      )}
    >
      {children}
    </button>
  );
}

export function StateDot({ state }: { state: "recording" | "paused" | "cli" }) {
  return (
    <span
      aria-hidden
      className={classNames(
        "inline-block w-[7px] h-[7px] rounded-full shrink-0",
        state === "recording" && "bg-success ring-3 ring-success/20",
        state === "cli" && "bg-info ring-3 ring-info/20",
        state === "paused" && "border-[1.5px] border-text-subtlest",
      )}
    />
  );
}

function MenuRow({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  /** Under the title; null for a title that says it all */
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1rem_minmax(0,1fr)_auto] gap-x-3 items-start px-1.5 py-1 w-[24rem] max-w-full">
      <span className="h-5 flex items-center justify-center">{icon}</span>
      <div>
        <div className="text-sm text-text">{title}</div>
        {description != null && (
          <div className="text-xs text-text-subtle mt-0.5">{description}</div>
        )}
      </div>
      <span className="self-center">{action}</span>
    </div>
  );
}
