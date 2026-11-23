import { i18n } from "@yaakapp-internal/i18n";
import type { AnyModel, Workspace } from "@yaakapp-internal/models";

type ModelType = AnyModel["model"];

type WorkspaceRequestSettings = Pick<
  Workspace,
  | "settingFollowRedirects"
  | "settingHttpVersion"
  | "settingRequestMessageSize"
  | "settingRequestTimeout"
  | "settingSendCookies"
  | "settingStoreCookies"
  | "settingValidateCertificates"
>;

type ModelForType<T extends ModelType> = Extract<AnyModel, { model: T }>;

type ModelTypeWithSetting<K extends RequestSettingKey> = {
  [M in ModelType]: K extends keyof ModelForType<M> ? M : never;
}[ModelType];

export type RequestSettingDefinition<K extends RequestSettingKey = RequestSettingKey> = {
  defaultValue: WorkspaceRequestSettings[K];
  description: string;
  modelKey: K;
  models: readonly ModelTypeWithSetting<K>[];
  title: string;
};

export type RequestSettingKey = keyof WorkspaceRequestSettings;

function defineRequestSetting<const K extends RequestSettingKey>(
  setting: RequestSettingDefinition<K>,
) {
  return setting;
}

export const SETTING_REQUEST_TIMEOUT = defineRequestSetting({
  defaultValue: 0,
  description: i18n.t("settings.requestTimeoutDesc"),
  modelKey: "settingRequestTimeout",
  models: ["workspace", "folder", "http_request"],
  title: i18n.t("settings.requestTimeout"),
});

export const SETTING_REQUEST_MESSAGE_SIZE = defineRequestSetting({
  defaultValue: 64 * 1024 * 1024,
  description: i18n.t("settings.messageSizeLimitDesc"),
  modelKey: "settingRequestMessageSize",
  models: ["workspace", "folder", "websocket_request", "grpc_request"],
  title: i18n.t("settings.messageSizeLimit"),
});

export const SETTING_VALIDATE_CERTIFICATES = defineRequestSetting({
  defaultValue: true,
  description: i18n.t("settings.validateTlsDesc"),
  modelKey: "settingValidateCertificates",
  models: ["workspace", "folder", "http_request", "websocket_request", "grpc_request"],
  title: i18n.t("settings.validateTls"),
});

export const SETTING_FOLLOW_REDIRECTS = defineRequestSetting({
  defaultValue: true,
  description: i18n.t("settings.followRedirectsDesc"),
  modelKey: "settingFollowRedirects",
  models: ["workspace", "folder", "http_request"],
  title: i18n.t("settings.followRedirects"),
});

export const SETTING_HTTP_VERSION = defineRequestSetting({
  defaultValue: "auto",
  description: i18n.t("settings.httpVersionDesc"),
  modelKey: "settingHttpVersion",
  models: ["workspace", "folder", "http_request"],
  title: i18n.t("settings.httpVersion"),
});

export const SETTING_SEND_COOKIES = defineRequestSetting({
  defaultValue: true,
  description: i18n.t("settings.sendCookiesDesc"),
  modelKey: "settingSendCookies",
  models: ["workspace", "folder", "http_request", "websocket_request"],
  title: i18n.t("settings.sendCookies"),
});

export const SETTING_STORE_COOKIES = defineRequestSetting({
  defaultValue: true,
  description: i18n.t("settings.storeCookiesDesc"),
  modelKey: "settingStoreCookies",
  models: ["workspace", "folder", "http_request", "websocket_request"],
  title: i18n.t("settings.storeCookies"),
});

export function modelSupportsSetting<K extends RequestSettingKey>(
  model: Pick<AnyModel, "model">,
  setting: RequestSettingDefinition<K>,
) {
  return setting.models.some((modelType) => modelType === model.model);
}
