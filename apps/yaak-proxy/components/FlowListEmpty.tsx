import { i18n } from "@yaakapp-internal/i18n";
import { EmptyStateText, Hotkey, Icon, InlineCode } from "@yaakapp-internal/ui";
import classNames from "classnames";
import { useAtomValue, useStore } from "jotai";
import { useEffect, useState } from "react";
import { appliedFilterAtom } from "../lib/atoms";
import { applyFilter } from "../lib/navigation";
import { rpc } from "../lib/rpc";
import { activeQuery, widerQueries } from "../lib/query";
import {
  hideEncryptedAtom,
  hideSystemAtom,
  pausedAtAtom,
  proxyStateAtom,
  searchWindowAtom,
} from "../lib/store";

/** Nothing to list: no flows yet, recording paused, or a query nothing matches */
export function FlowListEmpty() {
  const text = useAtomValue(appliedFilterAtom);
  const search = useAtomValue(searchWindowAtom);
  const proxyState = useAtomValue(proxyStateAtom);
  if (search?.loading) return null;
  if (text.trim() !== "") return <NoResults text={text} />;

  const other = proxyState?.otherOwner ?? null;
  const port = proxyState?.port ?? other?.proxyPort ?? null;
  const running = proxyState?.state === "running" || other != null;
  const recording = proxyState?.recording !== false;
  return (
    <EmptyStateText wrapperClassName="p-1.5" className="not-italic flex-col gap-1 text-center px-6">
      <div className="text-text text-sm">{recording ? i18n.t("flows.noFlowsYet") : i18n.t("flows.recordingIsPaused")}</div>
      <div className="text-sm text-text-subtle max-w-[26rem]">
        {!running
          ? i18n.t("flows.retryFromStatus")
          : !recording
            ? i18n.t("flows.trafficPassesThrough")
            : i18n.t("flows.trafficSentToPort", { port: port ?? "--" })}
      </div>
    </EmptyStateText>
  );
}

/**
 * The list's last row while recording is paused, where the next flow would appear: since when.
 */
export function PausedRow({ style }: { style?: React.CSSProperties }) {
  const pausedAt = useAtomValue(pausedAtAtom);
  return (
    <div
      style={style}
      className={classNames(
        "absolute left-1.5 right-1.5 flex items-center gap-2 h-xs px-3 mt-1",
        "rounded-md border border-dashed border-border-subtle text-text-subtle text-sm",
      )}
    >
      <Icon icon="circle_pause" size="sm" className="text-text-subtlest" />
      <span className="truncate">
        {pausedAt == null ? i18n.t("flows.recordingPaused") : i18n.t("flows.pausedAt", { time: timeOf(pausedAt) })}
      </span>
      <Hotkey action="recording_toggle" variant="text" className="ml-auto" />
    </div>
  );
}

/**
 * A query nothing matches: wider ones that do, each the query with one term left out, as Yaak's
 * sidebar answers, with how many each would match.
 */
function NoResults({ text }: { text: string }) {
  const hideSystem = useAtomValue(hideSystemAtom);
  const hideEncrypted = useAtomValue(hideEncryptedAtom);
  const store = useStore();
  const setText = (wider: string) => applyFilter(store, wider);
  const [wider, setWider] = useState<{ text: string; count: number }[]>([]);

  useEffect(() => {
    let current = true;
    const candidates = widerQueries(text);
    void Promise.all(
      candidates.map(async (candidate) => {
        const query = activeQuery(candidate, hideSystem, hideEncrypted);
        const res = await rpc("list_flows", { ...query, limit: 0 });
        return { text: candidate, count: query == null ? res.total : (res.matching ?? res.total) };
      }),
    )
      .then((found) => {
        if (current) setWider(found.filter((f) => f.count > 0).slice(0, 3));
      })
      .catch(() => {
        if (current) setWider([]);
      });
    return () => {
      current = false;
    };
  }, [text, hideSystem, hideEncrypted]);

  return (
    <EmptyStateText
      wrapperClassName="p-1.5 !h-auto"
      className="not-italic !h-auto py-3 px-4 text-sm text-text-subtle"
    >
      <div className="text-center leading-relaxed">
        {wider.length === 0 ? i18n.t("flows.noResults") : i18n.t("flows.noResultsBut")}
        {wider.map((w, i) => (
          <span key={w.text}>
            {i > 0 && i18n.t("flows.orWord")}
            <button type="button" className="hover:underline" onClick={() => setText(w.text)}>
              <InlineCode>{w.text === "" ? i18n.t("flows.allTraffic") : w.text}</InlineCode>
            </button>{" "}
            ({w.count.toLocaleString()})
          </span>
        ))}
      </div>
    </EmptyStateText>
  );
}

function timeOf(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
