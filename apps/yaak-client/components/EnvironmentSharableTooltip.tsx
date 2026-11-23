import { i18n } from "@yaakapp-internal/i18n";
import { IconTooltip } from "@yaakapp-internal/ui";

export function EnvironmentSharableTooltip() {
  return (
    <IconTooltip content={i18n.t("env.sharableTooltip")} />
  );
}
