import { i18n } from "@yaakapp-internal/i18n";
import type { Flow } from "@yaakapp-internal/proxy-lib";

export type PhaseKind = "start" | "step" | "end" | "error" | "cancelled";

/** One row of a flow's Timeline: a moment in the exchange, and how long it took to reach it */
export interface FlowPhase {
  key: string;
  label: string;
  kind: PhaseKind;
  /** Milliseconds from the start */
  atMs: number;
  /** Milliseconds since the phase before */
  tookMs: number;
  detail?: string;
}

export type PhaseFlow = Pick<
  Flow,
  | "elapsedHeadersMs"
  | "elapsedMs"
  | "status"
  | "error"
  | "cancelled"
  | "streamKind"
  | "elapsedConnectMs"
  | "elapsedTlsMs"
  | "elapsedRequestMs"
>;

/**
 * The phases the engine recorded for a flow, in order: started, connected, TLS, request sent,
 * headers, and how it ended. A phase the engine has no time for is left out; an open flow has
 * no end yet.
 */
export function flowPhases(flow: PhaseFlow): FlowPhase[] {
  const steps: Omit<FlowPhase, "tookMs">[] = [
    { key: "start", label: i18n.t("flows.phaseStarted"), kind: "start", atMs: 0 },
  ];
  const add = (key: string, label: string, atMs: number | null | undefined) => {
    if (atMs != null) steps.push({ key, label, kind: "step", atMs });
  };
  add("connect", i18n.t("flows.phaseConnected"), flow.elapsedConnectMs);
  add("tls", i18n.t("flows.phaseTls"), flow.elapsedTlsMs);
  add("request", i18n.t("flows.phaseRequestSent"), flow.elapsedRequestMs);
  add(
    "headers",
    flow.status == null
      ? i18n.t("flows.phaseHeadersReceived")
      : i18n.t("flows.phaseHeadersReceivedStatus", { status: flow.status }),
    flow.elapsedHeadersMs,
  );

  if (flow.elapsedMs != null || flow.error != null || flow.cancelled) {
    const atMs = flow.elapsedMs ?? steps[steps.length - 1]?.atMs ?? 0;
    if (flow.error != null) {
      steps.push({ key: "end", label: i18n.t("flows.phaseFailed"), kind: "error", atMs, detail: flow.error });
    } else if (flow.cancelled) {
      steps.push({ key: "end", label: i18n.t("flows.phaseCancelled"), kind: "cancelled", atMs });
    } else {
      const label = flow.streamKind == null ? i18n.t("flows.phaseBodyReceived") : i18n.t("flows.phaseClosed");
      steps.push({ key: "end", label, kind: "end", atMs });
    }
  }

  // Times come from different clocks in the engine; keep them in order regardless
  steps.sort((a, b) => a.atMs - b.atMs);
  return steps.map((s, i) => ({ ...s, tookMs: i === 0 ? 0 : s.atMs - (steps[i - 1]?.atMs ?? 0) }));
}
