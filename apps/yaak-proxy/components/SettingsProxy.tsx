import { useQueryClient } from "@tanstack/react-query";
import { i18n } from "@yaakapp-internal/i18n";
import { formatSize } from "@yaakapp-internal/lib/formatSize";
import type { HttpVersion, SystemProxyStatus, TrafficRetention } from "@yaakapp-internal/proxy-lib";
import {
  Button,
  Dialog,
  DialogFooter,
  Icon,
  IconTooltip,
  RadioDropdown,
  SettingRow,
  SettingRowBoolean,
  PlainInput,
  SettingRowSelect,
  SettingSelectControl,
  SettingSnippet,
  SettingsList,
  SettingsPage,
  SettingsSection,
} from "@yaakapp-internal/ui";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { useState } from "react";
import { useRpcMutation } from "../hooks/useRpcMutation";
import { useRpcQuery } from "../hooks/useRpcQuery";
import { helperDialogOpenAtom } from "../lib/atoms";
import { confirmClearFlowsAtom } from "../lib/clearFlows";
import {
  defaultShell,
  environmentBlock,
  environmentVars,
  TERMINAL_SHELLS,
  type TerminalShell,
} from "../lib/env";
import {
  keepTrafficOptions,
  sizeFromOptionValue,
  sizeOptionsFor,
  sizeOptionValue,
} from "../lib/settings";
import { helperRow } from "../lib/systemProxy";
import { proxyStateAtom, refreshProxyState } from "../lib/store";
import { getOsType } from "../lib/tauri";
import { useShowToast } from "../lib/toast";
import { DecryptionSettings } from "./DecryptListEditor";

/**
 * The proxy's own settings tab: how it listens and the system proxy, what it decrypts, what
 * happens to captured traffic, and the environment for one terminal. Everything set once and
 * left alone, which is what left the state pill's menu.
 */
export function SettingsProxy() {
  const proxyState = useAtomValue(proxyStateAtom);
  const store = useStore();
  const refresh = { onSettled: () => void refreshProxyState(store) };
  const setHttpVersion = useRpcMutation("set_http_version", refresh);
  const setAtLaunch = useRpcMutation("set_system_proxy_at_launch", refresh);
  const systemProxy = useRpcQuery("system_proxy_status", {});
  // Another process owning the engine wouldn't see changes until it restarts
  const elsewhere = proxyState?.otherOwner != null;

  return (
    <SettingsPage
      title={i18n.t("flows.settingsTitle")}
      description={i18n.t("flows.settingsDesc")}
    >
      <SettingsList className="space-y-8">
        <SettingsSection title={i18n.t("flows.sectionProxy")}>
          <PortRow disabled={elsewhere} />
          <SettingRowSelect<HttpVersion>
            name="httpVersion"
            title={i18n.t("flows.httpVersion")}
            description={i18n.t("flows.httpVersionDesc")}
            value={proxyState?.httpVersion ?? "auto"}
            disabled={elsewhere}
            onChange={(httpVersion) => setHttpVersion.mutate({ httpVersion })}
            options={[
              { label: i18n.t("flows.httpAuto"), value: "auto" },
              { label: i18n.t("flows.http1Only"), value: "http1Only" },
            ]}
          />
          {systemProxy.data?.supported === true && (
            <>
              <SettingRowBoolean
                title={i18n.t("flows.overrideAtLaunch")}
                description={i18n.t("flows.everyAppRecorded")}
                checked={proxyState?.systemProxyAtLaunch ?? true}
                disabled={setAtLaunch.isPending}
                onChange={(enabled) => setAtLaunch.mutate({ enabled })}
              />
              <HelperRow status={systemProxy.data} />
            </>
          )}
        </SettingsSection>

        <SettingsSection title={i18n.t("flows.sectionDecryption")}>
          <DecryptionSettings />
        </SettingsSection>

        <SettingsSection title={i18n.t("flows.sectionTraffic")}>
          <TrafficRow />
          {proxyState?.traffic === "keep" && <KeepTrafficRow />}
          <ConfirmClearRow />
          <ResetRow />
        </SettingsSection>

        <SettingsSection title={i18n.t("flows.sectionTerminal")}>
          <TerminalRow />
        </SettingsSection>
      </SettingsList>
    </SettingsPage>
  );
}

/** A port from 1 to 65535, or null */
function parsePort(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const port = Number(text.trim());
  return port > 0 && port < 65536 ? port : null;
}

/**
 * The port, saved when the field is left or Enter is pressed rather than on each keystroke:
 * every save restarts a running proxy, so typing 8080 must not restart it on 8, 80 and 808.
 */
function PortRow({ disabled }: { disabled: boolean }) {
  const proxyState = useAtomValue(proxyStateAtom);
  const store = useStore();
  const showToast = useShowToast();
  const saved = proxyState?.configuredPort ?? 9090;
  const [draft, setDraft] = useState<string | null>(null);
  // Puts the saved port back in the field after a rejected or failed change
  const [resets, setResets] = useState(0);
  const reset = () => {
    setDraft(null);
    setResets((n) => n + 1);
  };
  const setPort = useRpcMutation("set_port", {
    onError: (err) => showToast({ message: err.message, color: "danger" }),
    onSettled: () => {
      reset();
      void refreshProxyState(store);
    },
  });
  const commit = () => {
    if (draft == null || setPort.isPending) return;
    const port = parsePort(draft);
    if (port == null || port === saved) {
      reset();
      return;
    }
    setPort.mutate({ port });
  };
  return (
    <SettingRow title={i18n.t("flows.port")} description={i18n.t("flows.portDesc")}>
      <PlainInput
        hideLabel
        size="sm"
        name="port"
        label={i18n.t("flows.port")}
        type="number"
        containerClassName="w-48!"
        defaultValue={`${saved}`}
        forceUpdateKey={`${saved}.${resets}`}
        disabled={disabled || setPort.isPending}
        validate={(v) => parsePort(v) != null}
        onChange={setDraft}
        onBlur={commit}
        onKeyDownCapture={(e) => {
          if (e.key === "Enter") commit();
        }}
      />
    </SettingRow>
  );
}

function HelperRow({ status }: { status: SystemProxyStatus }) {
  const queryClient = useQueryClient();
  const openDialog = useSetAtom(helperDialogOpenAtom);
  const unregister = useRpcMutation("helper_unregister", {
    onSuccess: (status) =>
      queryClient.setQueryData<SystemProxyStatus>(["system_proxy_status", {}], status),
  });
  const row = helperRow(status.helper, status.backend);
  return (
    <SettingRow
      title={i18n.t("flows.helperRow")}
      description={
        unregister.error != null ? (
          <span className="text-danger">{unregister.error.message}</span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            {row.description}
            <IconTooltip iconSize="sm" content={row.tooltip} />
          </span>
        )
      }
    >
      {row.action != null && (
        <Button
          size="xs"
          variant="border"
          color={row.action === "unregister" ? "default" : "primary"}
          isLoading={unregister.isPending}
          onClick={() => (row.action === "unregister" ? unregister.mutate({}) : openDialog(true))}
        >
          {row.action === "install"
            ? i18n.t("flows.install")
            : row.action === "approve"
              ? i18n.t("flows.approve")
              : i18n.t("flows.uninstall")}
        </Button>
      )}
    </SettingRow>
  );
}

/** Whether captured traffic is cleared as the app launches or kept between launches */
function TrafficRow() {
  const proxyState = useAtomValue(proxyStateAtom);
  const store = useStore();
  const setTraffic = useRpcMutation("set_traffic", {
    onSettled: () => void refreshProxyState(store),
  });
  return (
    <SettingRowSelect<TrafficRetention>
      name="traffic"
      title={i18n.t("flows.recordedTraffic")}
      selectClassName="w-56!"
      value={proxyState?.traffic ?? "clearOnLaunch"}
      disabled={proxyState?.otherOwner != null}
      onChange={(traffic) => setTraffic.mutate({ traffic })}
      options={[
        { label: i18n.t("flows.clearOnLaunch"), value: "clearOnLaunch" },
        { label: i18n.t("flows.keepBetweenLaunches"), value: "keep" },
      ]}
    />
  );
}

/** The most traffic kept between launches, beside what is stored now */
function KeepTrafficRow() {
  const proxyState = useAtomValue(proxyStateAtom);
  const store = useStore();
  const size = useRpcQuery("get_storage_size", {}, { refetchInterval: 10_000 });
  const setKeep = useRpcMutation("set_keep_traffic", {
    onSettled: () => void refreshProxyState(store),
  });
  const keep = proxyState?.keepTrafficBytes ?? null;
  return (
    <SettingRow title={i18n.t("flows.sizeLimit")} description={i18n.t("flows.sizeLimitDesc")}>
      <div className="flex items-center gap-3">
        {size.data != null && (
          <span className="text-sm text-text-subtle tabular-nums whitespace-nowrap">
            {i18n.t("flows.sizeUsed", { size: formatSize(size.data.bytes) })}
          </span>
        )}
        <SettingSelectControl
          name="keepTraffic"
          label={i18n.t("flows.sizeLimit")}
          value={sizeOptionValue(keep)}
          disabled={proxyState?.otherOwner != null}
          onChange={(v) => setKeep.mutate({ bytes: sizeFromOptionValue(v) })}
          options={sizeOptionsFor(keepTrafficOptions(), keep).map(({ label, value }) => ({
            label,
            value,
          }))}
        />
      </div>
    </SettingRow>
  );
}

/** Asking before Clear, which its dialog's "Don't ask again" turns off */
function ConfirmClearRow() {
  const [confirm, setConfirm] = useAtom(confirmClearFlowsAtom);
  return (
    <SettingRowBoolean title={i18n.t("flows.confirmBeforeClearing")} checked={confirm} onChange={setConfirm} />
  );
}

function ResetRow() {
  const [confirming, setConfirming] = useState(false);
  const store = useStore();
  const queryClient = useQueryClient();
  const showToast = useShowToast();
  const reset = useRpcMutation("reset_captured_data", {
    onSuccess: () => {
      setConfirming(false);
      void queryClient.invalidateQueries();
      showToast({ message: i18n.t("flows.recordedDataReset") });
    },
    onSettled: () => void refreshProxyState(store),
  });
  return (
    <SettingRow
      title={i18n.t("flows.resetRecordedData")}
      description={i18n.t("flows.resetRecordedDataDesc")}
    >
      <Button size="xs" variant="border" color="danger" onClick={() => setConfirming(true)}>
        {i18n.t("flows.reset")}
      </Button>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        size="sm"
        title={i18n.t("flows.resetRecordedData")}
        description={i18n.t("flows.resetDialogDesc")}
      >
        {reset.error != null && <p className="text-danger text-sm">{reset.error.message}</p>}
        <DialogFooter
          actions={[
            { label: i18n.t("common.cancel"), variant: "border", onClick: () => setConfirming(false) },
            {
              label: i18n.t("flows.reset"),
              color: "danger",
              isLoading: reset.isPending,
              onClick: () => reset.mutate({}),
            },
          ]}
        />
      </Dialog>
    </SettingRow>
  );
}

function TerminalRow() {
  const proxyState = useAtomValue(proxyStateAtom);
  const caStatus = useRpcQuery("ca_status", {});
  const showToast = useShowToast();
  const os = getOsType();
  const [shell, setShell] = useState<TerminalShell>(() => defaultShell(os));
  const openTerminal = useRpcMutation("open_terminal", {
    onError: (err) => showToast({ message: err.message, color: "danger" }),
  });
  const port =
    proxyState?.port ?? proxyState?.otherOwner?.proxyPort ?? proxyState?.configuredPort ?? 9090;
  const caPath = caStatus.data?.certPath;
  const shellLabel = TERMINAL_SHELLS.find((s) => s.value === shell)?.label ?? shell;

  return (
    <div className="py-4">
      <div className="flex items-center gap-2">
        <span className="text-text">{i18n.t("flows.environment")}</span>
        <RadioDropdown
          value={shell}
          onChange={(v) => setShell(v as TerminalShell)}
          items={TERMINAL_SHELLS.map((s) => ({ label: s.label, value: s.value }))}
        >
          <Button
            size="2xs"
            variant="border"
            title={i18n.t("flows.shellLabel")}
            rightSlot={<Icon icon="chevron_down" size="xs" className="ml-1" />}
          >
            {shellLabel}
          </Button>
        </RadioDropdown>
        <Button
          size="2xs"
          variant="border"
          className="ml-auto"
          title={
            os === "macos"
              ? i18n.t("flows.terminalHintMac")
              : i18n.t("flows.terminalHintOther")
          }
          disabled={caPath == null || os !== "macos"}
          isLoading={openTerminal.isPending}
          onClick={() =>
            caPath != null && openTerminal.mutate({ vars: environmentVars(port, caPath) })
          }
        >
          {i18n.t("flows.openTerminal")}
        </Button>
      </div>
      <p className="mt-1 text-sm text-text-subtle">{i18n.t("flows.terminalRecordedHint")}</p>
      {caPath != null && (
        <SettingSnippet
          className="mt-3"
          language="text"
          snippet={environmentBlock(shell, port, caPath)}
        />
      )}
    </div>
  );
}
