import { pluralizeCount } from "@yaakapp-internal/lib/pluralize";
import { differenceInDays } from "date-fns";
import { formatDate } from "date-fns/format";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToggle } from "../../hooks/useToggle";
import { Banner } from "../Banner";
import { Button } from "../Button";
import { ExternalLink } from "../ExternalLink";
import { Icon } from "../Icon";
import { PlainInput } from "../PlainInput";
import { Separator } from "../Separator";
import { HStack, VStack } from "../Stacks";
import type { SettingsCallbacks, SettingsLicenseStatus, SettingsView } from "./types";

export interface SettingsLicenseProps {
  view: Pick<SettingsView, "app" | "license">;
  callbacks: Pick<
    SettingsCallbacks,
    "onActivateLicense" | "onDeactivateLicense" | "onOpenUrl" | "pricingUrl"
  >;
}

export function SettingsLicense({ view, callbacks }: SettingsLicenseProps) {
  const { t } = useTranslation();
  const [key, setKey] = useState<string>("");
  const [activateFormVisible, toggleActivateFormVisible] = useToggle(false);
  const license = view.license;

  if (license == null || license.pending) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {license.status && (
        <LicenseStatusBanner
          status={license.status}
          appName={view.app.name}
          callbacks={callbacks}
        />
      )}

      {license.checkError && <Banner color="danger">{license.checkError}</Banner>}
      {license.activateError && <Banner color="danger">{license.activateError}</Banner>}

      {license.status?.status === "active" ? (
        <HStack space={2}>
          <Button
            variant="border"
            color="secondary"
            size="sm"
            onClick={() => callbacks.onDeactivateLicense()}
          >
            {t("license.deactivate")}
          </Button>
          <Button
            color="secondary"
            size="sm"
            onClick={() =>
              callbacks.onOpenUrl("https://yaak.app/dashboard?intent=app.license.support")
            }
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
              callbacks.onOpenUrl(
                callbacks.pricingUrl(`app.license.purchase.${license.status?.status ?? "unknown"}`),
              )
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
            await callbacks.onActivateLicense(key);
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
          <Button type="submit" color="primary" size="sm" isLoading={license.activating}>
            {t("license.submit")}
          </Button>
        </VStack>
      )}
    </div>
  );
}

function LicenseStatusBanner({
  status,
  callbacks,
}: {
  status: SettingsLicenseStatus;
  appName: string;
  callbacks: SettingsLicenseProps["callbacks"];
}) {
  const { t } = useTranslation();
  const link = (href: string, children: string, noUnderline?: boolean) => (
    <ExternalLink href={href} noUnderline={noUnderline} onOpen={callbacks.onOpenUrl}>
      {children}
    </ExternalLink>
  );

  switch (status.status) {
    case "active":
      return <Banner color="success">{t("license.activeBanner")}</Banner>;

    case "trialing":
      return (
        <Banner color="info" className="max-w-lg">
          <p className="w-full">
            <strong>{pluralizeCount("day", differenceInDays(status.trialEnd, new Date()))}</strong>{" "}
            {t("license.trialDaysLeft")}
            <br />
            <span className="opacity-50">{t("license.personalAlwaysFree")}</span>
            <Separator className="my-2" />
            <div className="flex flex-wrap items-center gap-x-2 text-sm text-notice">
              {link(
                callbacks.pricingUrl(`app.license.learn.${status.status}`),
                t("license.learnMore"),
                true,
              )}
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
              {link(
                callbacks.pricingUrl(`app.license.learn.${status.status}`),
                t("license.learnMore"),
                true,
              )}
            </div>
          </p>
        </Banner>
      );

    case "inactive":
      return (
        <Banner color="danger">
          {t("license.invalidPrefix")} {link("https://yaak.app/dashboard", t("license.signIn"))}{" "}
          {t("license.invalidSuffix")}
        </Banner>
      );

    case "expired":
      return (
        <Banner color="notice">
          {t("license.expiredPrefix")} <strong>{formatDate(status.periodEnd, "MMMM dd, yyyy")}</strong>
          {t("license.expiredMid")}{" "}
          {link("https://yaak.app/dashboard", t("license.resubscribe"))} {t("license.expiredSuffix")}
          {status.changesUrl && (
            <>
              <br />
              {link(status.changesUrl, t("license.whatsNew"))}
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
          {link(status.billingUrl, t("license.updateBilling"))}.
        </Banner>
      );

    case "error":
      return (
        <Banner color="danger">
          {t("license.checkFailed", { message: status.message, code: status.code })}
        </Banner>
      );
  }
}
