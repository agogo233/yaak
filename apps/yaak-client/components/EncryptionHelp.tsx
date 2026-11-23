import { i18n } from "@yaakapp-internal/i18n";
import { VStack } from "@yaakapp-internal/ui";

export function EncryptionHelp() {
  return (
    <VStack space={3}>
      <p>{i18n.t("common.encryptionHelpTitle")}</p>
      <p>{i18n.t("common.encryptionHelpSync")}</p>
    </VStack>
  );
}
