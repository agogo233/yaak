import { i18n } from "@yaakapp-internal/i18n";
import type { Flow } from "@yaakapp-internal/proxy-lib";
import {
  type EventStreamColumns,
  EventStreamViewer,
  HStack,
  type StreamEvent,
  type StreamPayloadView,
} from "@yaakapp-internal/ui";
import { useCallback, useMemo } from "react";
import { useFlowMessages, useMessageSource } from "../hooks/useFlowMessages";
import { base64ToBytes } from "../lib/body";
import { grpcStatusText, messageToStreamEvent, streamIsOpen } from "../lib/messages";

function WEBSOCKET_COLUMNS(): EventStreamColumns {
  return {
    direction: true,
    kind: i18n.t("flows.columnType"),
    preview: i18n.t("events.message"),
    size: true,
    time: true,
  };
}
function SSE_COLUMNS(): EventStreamColumns {
  return {
    kind: i18n.t("flows.nounEvent"),
    kindWidth: "9.5rem",
    preview: i18n.t("flows.columnData"),
    size: true,
    time: true,
  };
}
function GRPC_COLUMNS(): EventStreamColumns {
  return {
    direction: true,
    kind: i18n.t("flows.columnType"),
    preview: i18n.t("events.message"),
    size: true,
    time: true,
  };
}

/**
 * A streaming flow's messages: a WebSocket's frames, an event stream's events, a gRPC call's
 * messages and status, following new ones while the stream is open. The selected message's
 * payload opens below as text or a hexdump; a gRPC message's also decoded, with its schema or
 * without one.
 */
export function FlowMessages({ flow }: { flow: Flow }) {
  const source = useMessageSource();
  const { messages, loading, error } = useFlowMessages(flow.id, source, flow.messageCount);
  const events = useMemo(() => messages.map(messageToStreamEvent), [messages]);
  const kind = flow.streamKind;
  const grpc = kind === "grpc" || kind === "grpc_web";
  const columns = kind === "sse" ? SSE_COLUMNS() : grpc ? GRPC_COLUMNS() : WEBSOCKET_COLUMNS();
  const nounKey = kind === "sse" ? "flows.nounEvent" : "flows.nounMessage";
  const catchUp = useMemo(
    () => ({
      label: (count: number) =>
        i18n.t(count === 1 ? "flows.catchUpOne" : "flows.catchUpMany", {
          count,
          noun: i18n.t(nounKey),
        }),
    }),
    [nounKey],
  );

  const loadPayload = useCallback(
    async (event: StreamEvent) => {
      const res = await source.payload(flow.id, Number(event.key));
      return { bytes: base64ToBytes(res.data) };
    },
    [flow.id, source],
  );

  const payloadViews = useCallback(
    (event: StreamEvent): StreamPayloadView[] | null => {
      if (!grpc || event.direction === "info") return null;
      const decode = (schemaless: boolean) => async () => {
        const decoded = await source.decodeGrpc(flow.id, Number(event.key), schemaless);
        const note = [
          decoded.messageType == null ? null : i18n.t("flows.decodedAs", { type: decoded.messageType }),
          decoded.note,
        ]
          .filter(Boolean)
          .join(". ");
        return { text: decoded.json, language: "json" as const, note: note || null };
      };
      return [
        { value: "decoded", label: i18n.t("flows.decodedLabel"), type: "text", load: decode(false) },
        { value: "schemaless", label: i18n.t("flows.schemalessLabel"), type: "text", load: decode(true) },
        { value: "raw", label: i18n.t("flows.rawBytes"), type: "hexdump" },
      ];
    },
    [flow.id, grpc, source],
  );

  const open = streamIsOpen(flow);
  const count = Math.max(flow.messageCount, messages.length);
  const header = (
    <HStack space={2} className="pl-2 mb-1 h-xs font-mono text-xs text-text-subtle">
      {kind === "websocket" && (
        <>
          {open ? (
            <span className="text-success">{i18n.t("flows.statusConnected")}</span>
          ) : flow.error != null ? (
            <span className="text-danger">{i18n.t("flows.statusErrorWord")}</span>
          ) : (
            <span className="text-text-subtle">{i18n.t("flows.statusClosed")}</span>
          )}
          <span>&bull;</span>
        </>
      )}
      <span>
        {i18n.t(count === 1 ? "flows.countNoun_one" : "flows.countNoun_other", {
          count,
          noun: i18n.t(nounKey),
        })}
      </span>
      {grpc && flow.grpcStatus != null && (
        <>
          <span>&bull;</span>
          <span className={flow.grpcStatus === 0 ? "text-success" : "text-danger"}>
            {grpcStatusText(flow.grpcStatus, flow.grpcMessage)}
          </span>
        </>
      )}
    </HStack>
  );

  return (
    <EventStreamViewer
      events={events}
      header={header}
      error={error ?? (open ? null : flow.error)}
      isLoading={loading && events.length === 0}
      emptyMessage={
        open
          ? i18n.t("flows.waitingFirstNoun", { noun: i18n.t(nounKey) })
          : i18n.t("flows.noNoun", { noun: i18n.t(nounKey) })
      }
      splitLayoutStorageKey="proxy_flow_messages"
      columns={columns}
      loadPayload={loadPayload}
      payloadViews={payloadViews}
      catchUp={catchUp}
    />
  );
}
