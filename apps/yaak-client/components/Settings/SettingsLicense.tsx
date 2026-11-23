import { useLicense } from "@yaakapp-internal/license";
import { Banner, HStack, Icon, VStack } from "@yaakapp-internal/ui";
import { differenceInDays } from "date-fns";
import { formatDate } from "date-fns/format";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToggle } from "../../hooks/useToggle";
import { pricingUrl } from "../../lib/pricingUrl";
import { CargoFeature } from "../CargoFeature";
import { Button } from "../core/Button";
import { Link } from "../core/Link";
import { PlainInput } from "../core/PlainInput";
import { Separator } from "../core/Separator";
import { platform } from "@yaakapp-internal/platform";
import { pluralizeCount } from "@yaakapp-internal/lib/pluralize";

export function SettingsLicense() {
  return (
    <CargoFeature feature="license">
      <SettingsLicenseCmp />
    </CargoFeature>
  );
}

function SettingsLicenseCmp() {
  const { check, activate, deactivate } = useLicense();
  const [key, setKey] = useState<string>("");
  const [activateFormVisible, toggleActivateFormVisible] = useToggle(false);
  const { t } = useTranslation();

  if (check.isPending) {
    return null;
  }

  const renderBanner = () => {
    if (!check.data) return null;

    switch (check.data.status) {
      case "active":
        return <Banner color="success">{t("license.activeBanner")}</Banner>;

      case "trialing":
        return (
          <Banner color="info" className="max-w-lg">
            <p className="w-full">
              <strong>
                {pluralizeCount("day", differenceInDays(check.data.data.end, new Date()))}
              </strong>{" "}
              {t("license.trialDaysLeft")}
              <br />
              <span className="opacity-50">{t("license.personalAlwaysFree")}</span>
              <Separator className="my-2" />
              <div className="flex flex-wrap items-center gap-x-2 text-sm text-notice">
                <Link noUnderline href={pricingUrl(`app.license.learn.${check.data.status}`)}>
                  {t("license.learnMore")}
                </Link>
              </div>
            </p>
          </Banner>
        );

      case "personal_use":
        return (
          <Banner color="notice" className="max-w-lg">
            <p className="w-full">
              {t("license.trialEnded")}
              <br />
              <span className="opacity-50">
                {t("license.personalOnly")}
                <br />
                {t("license.commercialNeedsLicense")}
              </span>
              <Separator className="my-2" />
              <div className="flex flex-wrap items-center gap-x-2 text-sm text-notice">
                <Link noUnderline href={pricingUrl(`app.license.learn.${check.data.status}`)}>
                  {t("license.learnMore")}
                </Link>
              </div>
            </p>
          </Banner>
        );

      case "inactive":
        return (
          <Banner color="danger">
            {t("license.invalidPrefix")}{" "}
            <Link href="https://yaak.app/dashboard">{t("license.signIn")}</Link>{" "}
            {t("license.invalidSuffix")}
          </Banner>
        );

      case "expired":
        return (
          <Banner color="notice">
            {t("license.expiredPrefix")}{" "}
            <strong>{formatDate(check.data.data.periodEnd, "MMMM dd, yyyy")}</strong>
            {t("license.expiredMid")}{" "}
            <Link href="https://yaak.app/dashboard">{t("license.resubscribe")}</Link>{" "}
            {t("license.expiredSuffix")}
            {check.data.data.changesUrl && (
              <>
                <br />
                <Link href={check.data.data.changesUrl}>{t("license.whatsNew")}</Link>
              </>
            )}
          </Banner>
        );

      case "past_due":
        return (
          <Banner color="danger">
            <strong>{t("license.paymentAttention")}</strong>
            <br />
            {t("license.reactivatePrefix")}{" "}
            <Link href={check.data.data.billingUrl}>{t("license.updateBilling")}</Link>.
          </Banner>
        );

      case "error":
        return (
          <Banner color="danger">
            {t("license.checkFailed", {
              message: check.data.data.message,
              code: check.data.data.code,
            })}
          </Banner>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {renderBanner()}

      {check.error && <Banner color="danger">{check.error}</Banner>}
      {activate.error && <Banner color="danger">{activate.error}</Banner>}

      {check.data?.status === "active" ? (
        <HStack space={2}>
          <Button variant="border" color="secondary" size="sm" onClick={() => deactivate.mutate()}>
            {t("license.deactivate")}
          </Button>
          <Button
            color="secondary"
            size="sm"
            onClick={() => platform.openUrl("https://yaak.app/dashboard?intent=app.license.support")}
            rightSlot={<Icon icon="external_link" />}
          >
            {t("license.directSupport")}
          </Button>
        </HStack>
      ) : (
        <HStack space={2}>
          <Button variant="border" color="secondary" size="sm" onClick={toggleActivateFormVisible}>
            {t("license.activate")}
          </Button>
          <Button
            size="sm"
            color="primary"
            rightSlot={<Icon icon="external_link" />}
            onClick={() =>
              platform.openUrl(pricingUrl(`app.license.purchase.${check.data?.status ?? "unknown"}`))
            }
          >
            {t("license.purchase")}
          </Button>
        </HStack>
      )}

      {activateFormVisible && (
        <VStack
          as="form"
          space={3}
          className="max-w-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            await activate.mutateAsync({ licenseKey: key });
            toggleActivateFormVisible();
          }}
        >
          <PlainInput
            autoFocus
            label={t("license.licenseKey")}
            name="key"
            onChange={setKey}
            placeholder="YK1-XXXXX-XXXXX-XXXXX-XXXXX"
          />
          <Button type="submit" color="primary" size="sm" isLoading={activate.isPending}>
            {t("license.submit")}
          </Button>
        </VStack>
      )}
    </div>
  );
}
