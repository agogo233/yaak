import classNames from "classnames";
import { useTranslation } from "react-i18next";
import { PINNED_ACTION } from "../ActionsBar";
import { SegmentedControl } from "../SegmentedControl";
import type { ResponseViewMode } from "./ResponseBodyViewer";

/** What a body's formatted view shows, which names it in the switch */
export type PrettyView = "formatted" | "table" | "parts" | "preview" | "form";

const PRETTY_OPTIONS: Record<PrettyView, { label: string; tooltip: string }> = {
  formatted: { label: "Pretty", tooltip: "Formatted" },
  table: { label: "Table", tooltip: "As a table" },
  parts: { label: "Parts", tooltip: "Split into parts" },
  preview: { label: "Preview", tooltip: "Rendered" },
  form: { label: "Form", tooltip: "As fields" },
};

const RAW_OPTION = { label: "Raw", tooltip: "As received" };

/** Translation keys for each formatted view's label and tooltip, matching {@link PRETTY_OPTIONS} */
const PRETTY_LABEL_KEYS: Record<PrettyView, { label: string; tooltip: string }> = {
  formatted: { label: "response.viewPretty", tooltip: "response.viewFormatted" },
  table: { label: "response.viewTable", tooltip: "response.viewAsTable" },
  parts: { label: "response.viewParts", tooltip: "response.viewSplitIntoParts" },
  preview: { label: "response.viewPreview", tooltip: "response.viewRendered" },
  form: { label: "response.viewForm", tooltip: "response.viewAsFields" },
};

const RAW_LABEL_KEYS = { label: "response.viewRaw", tooltip: "response.viewAsReceived" };

/** The switch's labels for a body whose formatted view is `pretty`, its first state first */
export function viewModeLabels(pretty: PrettyView): [string, string] {
  return [PRETTY_OPTIONS[pretty].label, RAW_OPTION.label];
}

/**
 * The formatted view a text body has, or null when it has only the one view: a table for CSV,
 * parts for multipart, a rendering for SVG (and HTML, where `previewHtml`), and formatted text
 * for JSON, XML and HTML.
 */
export function prettyViewFor({
  mimeType,
  language,
  previewHtml = false,
}: {
  /** The media type, without parameters */
  mimeType: string | null;
  /** The language the text viewer would show the body in */
  language: string | null | undefined;
  /** HTML renders as a page, rather than formatted text */
  previewHtml?: boolean;
}): PrettyView | null {
  const mime = mimeType?.toLowerCase() ?? "";
  if (mime.startsWith("multipart/")) return "parts";
  if (/csv|tab-separated/.test(mime)) return "table";
  if (mime.startsWith("image/svg")) return "preview";
  if (language === "html") return previewHtml ? "preview" : "formatted";
  if (language === "json" || language === "xml") return "formatted";
  return null;
}

interface Props {
  /** The body's formatted view, named in the first state */
  pretty: PrettyView;
  value: ResponseViewMode;
  onChange: (value: ResponseViewMode) => void;
}

/** Shows a body formatted for its type, or raw as received; for an `ActionsBar`, always in view */
export function BodyViewModeSwitch({ pretty, value, onChange }: Props) {
  const { t } = useTranslation();
  const prettyKeys = PRETTY_LABEL_KEYS[pretty];
  return (
    <div {...PINNED_ACTION} className="rounded-md">
      <SegmentedControl<ResponseViewMode>
        name="body_view_mode"
        label={t("response.viewLabel")}
        hideLabel
        size="2xs"
        value={value}
        onChange={onChange}
        containerClassName="w-auto h-full"
        // As tall as the bar's `sm` icon buttons, its options filling the height inside the border
        className={classNames(
          "h-sm! m-0! p-0.5! gap-0.5! rounded-md! bg-surface! border border-border-subtle",
          "[&_[role=radio]]:h-full!",
        )}
        options={[
          { value: "pretty", label: t(prettyKeys.label), tooltip: t(prettyKeys.tooltip) },
          { value: "raw", label: t(RAW_LABEL_KEYS.label), tooltip: t(RAW_LABEL_KEYS.tooltip) },
        ]}
      />
    </div>
  );
}
