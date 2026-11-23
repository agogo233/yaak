import { patchModel, settingsAtom } from "@yaakapp-internal/models";
import type { ProxySetting } from "@yaakapp-internal/models";
import { Heading, InlineCode, VStack } from "@yaakapp-internal/ui";
import { useAtomValue } from "jotai";
import { useTranslation } from "react-i18next";
import { CommercialUseBanner } from "../CommercialUseBanner";
import {
  SettingRowBoolean,
  SettingRowSelect,
  SettingRowText,
  SettingsList,
  SettingsSection,
} from "../core/SettingRow";

export function SettingsProxy() {
  const settings = useAtomValue(settingsAtom);
  const { t } = useTranslation();
  const proxy = enabledProxyOrDefault(settings.proxy);

  const patchProxy = async (patch: Partial<EnabledProxySetting>) => {
    await patchModel(settings, {
      proxy: {
        ...proxy,
        ...patch,
        auth: Object.hasOwn(patch, "auth") ? (patch.auth ?? null) : proxy.auth,
      },
    });
  };

  return (
    <VStack space={1.5} className="mb-4">
      <div className="mb-3">
        <Heading>{t("proxy.title")}</Heading>
        <p className="text-text-subtle">{t("proxy.titleDesc")}</p>
      </div>
      <CommercialUseBanner source="proxy-settings" title={t("proxy.usingForWork")} />
      <SettingsList className="space-y-8">
        <SettingsSection title={t("proxy.section")}>
          <SettingRowSelect
            title={t("proxy.choice")}
            description={t("proxy.choiceDesc")}
            name="proxy"
            value={settings.proxy?.type ?? "automatic"}
            onChange={async (v) => {
              if (v === "automatic") {
                await patchModel(settings, { proxy: undefined });
              } else if (v === "enabled") {
                await patchModel(settings, { proxy });
              } else {
                await patchModel(settings, { proxy: { type: "disabled" } });
              }
            }}
            options={[
              { label: t("proxy.automatic"), value: "automatic" },
              { label: t("proxy.custom"), value: "enabled" },
              { label: t("proxy.noProxy"), value: "disabled" },
            ]}
            selectClassName="w-64!"
          />
        </SettingsSection>

        {settings.proxy?.type === "enabled" && (
          <>
            <SettingsSection title={t("proxy.customSection")}>
              <SettingRowBoolean
                checked={!settings.proxy.disabled}
                title={t("proxy.enableProxy")}
                description={t("proxy.enableProxyDesc")}
                onChange={(enabled) => patchProxy({ disabled: !enabled })}
              />
              <SettingRowText
                name="proxyHttp"
                title={
                  <>
                    {t("proxy.httpPrefix")} <InlineCode>http://</InlineCode> {t("proxy.httpSuffix")}
                  </>
                }
                description={t("proxy.httpDesc")}
                value={settings.proxy.http}
                placeholder="localhost:9090"
                onChange={(http) => patchProxy({ http })}
              />
              <SettingRowText
                name="proxyHttps"
                title={
                  <>
                    {t("proxy.httpsPrefix")} <InlineCode>https://</InlineCode>{" "}
                    {t("proxy.httpsSuffix")}
                  </>
                }
                description={t("proxy.httpsDesc")}
                value={settings.proxy.https}
                placeholder="localhost:9090"
                onChange={(https) => patchProxy({ https })}
              />
              <SettingRowText
                name="proxyBypass"
                title={t("proxy.bypass")}
                description={t("proxy.bypassDesc")}
                value={settings.proxy.bypass}
                placeholder="127.0.0.1, *.example.com, localhost:3000"
                inputWidthClassName="w-96!"
                onChange={(bypass) => patchProxy({ bypass })}
              />
            </SettingsSection>

            <SettingsSection title={t("proxy.auth")}>
              <SettingRowBoolean
                checked={settings.proxy.auth != null}
                title={t("proxy.enableAuth")}
                description={t("proxy.enableAuthDesc")}
                onChange={(enabled) =>
                  patchProxy({ auth: enabled ? { user: "", password: "" } : null })
                }
              />

              {settings.proxy.auth != null && (
                <>
                  <SettingRowText
                    required
                    name="proxyUser"
                    title={t("proxy.user")}
                    description={t("proxy.userDesc")}
                    value={settings.proxy.auth.user}
                    placeholder="myUser"
                    onChange={(user) =>
                      patchProxy({
                        auth: {
                          user,
                          password:
                            settings.proxy?.type === "enabled"
                              ? (settings.proxy.auth?.password ?? "")
                              : "",
                        },
                      })
                    }
                  />
                  <SettingRowText
                    name="proxyPassword"
                    title={t("proxy.password")}
                    description={t("proxy.passwordDesc")}
                    value={settings.proxy.auth.password}
                    placeholder="s3cretPassw0rd"
                    type="password"
                    onChange={(password) =>
                      patchProxy({
                        auth: {
                          user:
                            settings.proxy?.type === "enabled"
                              ? (settings.proxy.auth?.user ?? "")
                              : "",
                          password,
                        },
                      })
                    }
                  />
                </>
              )}
            </SettingsSection>
          </>
        )}
      </SettingsList>
    </VStack>
  );
}

type EnabledProxySetting = Extract<ProxySetting, { type: "enabled" }>;

function enabledProxyOrDefault(proxy: ProxySetting | null): EnabledProxySetting {
  if (proxy?.type === "enabled") return proxy;

  return {
    disabled: false,
    type: "enabled",
    http: "",
    https: "",
    auth: { user: "", password: "" },
    bypass: "",
  };
}
