import { useMutation, useQuery } from "@tanstack/react-query";
import type { Plugin } from "@yaakapp-internal/models";
import { patchModel, pluginsAtom } from "@yaakapp-internal/models";
import type { PluginVersion } from "@yaakapp-internal/plugins";
import { checkPluginUpdates, installPlugin, searchPlugins } from "@yaakapp-internal/plugins";
import {
  Banner,
  HStack,
  Icon,
  InlineCode,
  LoadingIcon,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  useDebouncedValue,
  CountBadge,
} from "@yaakapp-internal/ui";
import classNames from "classnames";
import { useAtomValue } from "jotai";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInstallPlugin } from "../../hooks/useInstallPlugin";
import { usePluginInfo, usePluginInfos } from "../../hooks/usePluginInfo";
import { usePluginsKey, useRefreshPlugins } from "../../hooks/usePlugins";
import { usePromptUninstallPlugin } from "../../hooks/useUninstallPlugin";
import { Button } from "../core/Button";
import { Checkbox } from "../core/Checkbox";
import { IconButton } from "../core/IconButton";
import { Link } from "../core/Link";
import { PlainInput } from "../core/PlainInput";
import { TabContent, Tabs } from "../core/Tabs/Tabs";
import { EmptyStateText } from "../EmptyStateText";
import { SelectFile } from "../SelectFile";
import { platform } from "@yaakapp-internal/platform";

interface SettingsPluginsProps {
  defaultSubtab?: string;
}

export function SettingsPlugins({ defaultSubtab }: SettingsPluginsProps) {
  const [directory, setDirectory] = useState<string | null>(null);
  const plugins = useAtomValue(pluginsAtom);
  const bundledPlugins = plugins.filter((p) => p.source === "bundled");
  const installedPlugins = plugins.filter((p) => p.source !== "bundled");
  const createPlugin = useInstallPlugin();
  const refreshPlugins = useRefreshPlugins();
  const { t } = useTranslation();
  return (
    <div className="h-full">
      <Tabs
        defaultValue={defaultSubtab}
        label={t("plugins.tabLabel")}
        addBorders
        tabListClassName="px-6 pt-2"
        tabs={[
          { label: t("plugins.discover"), value: "search" },
          {
            label: t("plugins.installed"),
            value: "installed",
            rightSlot: <CountBadge count={installedPlugins.length} />,
          },
          {
            label: t("plugins.bundled"),
            value: "bundled",
            rightSlot: <CountBadge count={bundledPlugins.length} />,
          },
        ]}
      >
        <TabContent value="search" className="px-6">
          <PluginSearch />
        </TabContent>
        <TabContent value="installed" className="pb-0">
          <div className="h-full grid grid-rows-[minmax(0,1fr)_auto]">
            <InstalledPlugins plugins={installedPlugins} className="px-6" />
            <footer className="grid grid-cols-[minmax(0,1fr)_auto] py-2 px-4 border-t bg-surface-highlight border-border-subtle min-w-0">
              <SelectFile
                size="xs"
                noun={t("plugins.pluginNoun")}
                directory
                onChange={({ filePath }) => setDirectory(filePath)}
                filePath={directory}
              />
              <HStack>
                {directory && (
                  <Button
                    size="xs"
                    color="primary"
                    className="ml-auto"
                    onClick={() => {
                      if (directory == null) return;
                      createPlugin.mutate(directory);
                      setDirectory(null);
                    }}
                  >
                    {t("plugins.addPlugin")}
                  </Button>
                )}
                <IconButton
                  size="sm"
                  icon="refresh"
                  title={t("plugins.reload")}
                  spin={refreshPlugins.isPending}
                  onClick={() => refreshPlugins.mutate()}
                />
                <IconButton
                  size="sm"
                  icon="help"
                  title={t("plugins.viewDocs")}
                  onClick={() =>
                    platform.openUrl("https://yaak.app/docs/plugin-development/plugins-quick-start")
                  }
                />
              </HStack>
            </footer>
          </div>
        </TabContent>
        <TabContent value="bundled" className="pb-0 px-6">
          <BundledPlugins plugins={bundledPlugins} />
        </TabContent>
      </Tabs>
    </div>
  );
}

function PluginTableRowForInstalledPlugin({ plugin }: { plugin: Plugin }) {
  const info = usePluginInfo(plugin.id).data;
  if (info == null) {
    return null;
  }

  return (
    <PluginTableRow
      plugin={plugin}
      version={info.version}
      name={info.name}
      displayName={info.displayName}
      url={plugin.url}
      showCheckbox={true}
      showUninstall={true}
    />
  );
}

function PluginTableRowForBundledPlugin({ plugin }: { plugin: Plugin }) {
  const info = usePluginInfo(plugin.id).data;
  if (info == null) {
    return null;
  }

  return (
    <PluginTableRow
      plugin={plugin}
      version={info.version}
      name={info.name}
      displayName={info.displayName}
      url={plugin.url}
      showCheckbox={true}
      showUninstall={false}
    />
  );
}

function PluginTableRowForRemotePluginVersion({ pluginVersion }: { pluginVersion: PluginVersion }) {
  const plugin = useAtomValue(pluginsAtom).find((p) => p.id === pluginVersion.id);
  const pluginInfo = usePluginInfo(plugin?.id ?? null).data;

  return (
    <PluginTableRow
      plugin={plugin ?? null}
      version={pluginInfo?.version ?? pluginVersion.version}
      name={pluginVersion.name}
      displayName={pluginVersion.displayName}
      url={pluginVersion.url}
      showCheckbox={false}
    />
  );
}

function PluginTableRow({
  plugin,
  name,
  version,
  displayName,
  url,
  showCheckbox = true,
  showUninstall = true,
}: {
  plugin: Plugin | null;
  name: string;
  version: string;
  displayName: string;
  url: string | null;
  showCheckbox?: boolean;
  showUninstall?: boolean;
}) {
  const updates = usePluginUpdates();
  const latestVersion = updates.data?.plugins.find((u) => u.name === name)?.version;
  const installPluginMutation = useMutation({
    mutationKey: ["install_plugin", name],
    mutationFn: (name: string) => installPlugin(name, null),
  });
  const uninstall = usePromptUninstallPlugin(plugin?.id ?? null, displayName);
  const refreshPlugins = useRefreshPlugins();
  const { t } = useTranslation();

  return (
    <TableRow>
      {showCheckbox && (
        <TableCell className="py-0!">
          <Checkbox
            hideLabel
            title={plugin?.enabled ? t("plugins.disablePlugin") : t("plugins.enablePlugin")}
            checked={plugin?.enabled ?? false}
            disabled={plugin == null}
            onChange={async (enabled) => {
              if (plugin) {
                await patchModel(plugin, { enabled });
                refreshPlugins.mutate();
              }
            }}
          />
        </TableCell>
      )}
      <TableCell className="font-semibold">
        {url ? (
          <Link noUnderline href={url}>
            {displayName}
          </Link>
        ) : (
          displayName
        )}
      </TableCell>
      <TableCell>
        <InlineCode>{name}</InlineCode>
      </TableCell>
      <TableCell>
        <HStack space={1.5}>
          <InlineCode>{version}</InlineCode>
          {latestVersion != null && (
            <InlineCode className="text-success flex items-center gap-1">
              <Icon icon="arrow_up" size="sm" />
              {latestVersion}
            </InlineCode>
          )}
        </HStack>
      </TableCell>
      <TableCell className="py-0!">
        <HStack justifyContent="end" space={1.5}>
          {plugin != null && latestVersion != null ? (
            <Button
              variant="border"
              color="success"
              title={t("plugins.updateTo", { version: latestVersion })}
              size="xs"
              isLoading={installPluginMutation.isPending}
              onClick={() => installPluginMutation.mutate(name)}
            >
              {t("plugins.update")}
            </Button>
          ) : plugin == null ? (
            <Button
              variant="border"
              color="primary"
              title={t("plugins.installVersion", { version })}
              size="xs"
              isLoading={installPluginMutation.isPending}
              onClick={() => installPluginMutation.mutate(name)}
            >
              {t("plugins.install")}
            </Button>
          ) : null}
          {showUninstall && uninstall != null && (
            <Button
              size="xs"
              title={t("plugins.uninstallPlugin")}
              variant="border"
              isLoading={uninstall.isPending}
              onClick={() => uninstall.mutate()}
            >
              {t("plugins.uninstall")}
            </Button>
          )}
        </HStack>
      </TableCell>
    </TableRow>
  );
}

function PluginSearch() {
  const [query, setQuery] = useState<string>("");
  const debouncedQuery = useDebouncedValue(query);
  const { t } = useTranslation();
  const results = useQuery({
    queryKey: ["plugins", debouncedQuery],
    queryFn: async () => {
      const { plugins } = await searchPlugins(query);
      return { plugins: plugins.filter((p) => p.deprecated == null) };
    },
  });

  return (
    <div className="h-full grid grid-rows-[auto_minmax(0,1fr)] gap-3">
      <HStack space={1.5}>
        <PlainInput
          hideLabel
          label={t("plugins.search")}
          placeholder={t("plugins.searchPlaceholder")}
          onChange={setQuery}
          defaultValue={query}
        />
      </HStack>
      <div className="w-full h-full">
        {results.data == null ? (
          <EmptyStateText>
            <LoadingIcon size="xl" className="text-text-subtlest" />
          </EmptyStateText>
        ) : (results.data.plugins ?? []).length === 0 ? (
          <EmptyStateText>{t("plugins.noPluginsFound")}</EmptyStateText>
        ) : (
          <Table scrollable>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("plugins.displayName")}</TableHeaderCell>
                <TableHeaderCell>{t("plugins.name")}</TableHeaderCell>
                <TableHeaderCell>{t("plugins.version")}</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {results.data.plugins.map((p) => (
                <PluginTableRowForRemotePluginVersion key={p.id} pluginVersion={p} />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function InstalledPlugins({ plugins, className }: { plugins: Plugin[]; className?: string }) {
  const { t } = useTranslation();
  return plugins.length === 0 ? (
    <div className={classNames(className, "pb-4")}>
      <EmptyStateText className="text-center">
        {t("plugins.emptyLine1")}
        <br />
        {t("plugins.emptyLine2")}
      </EmptyStateText>
    </div>
  ) : (
    <div className={classNames(className, "h-full grid grid-rows-[auto_minmax(0,1fr)]")}>
      <DeprecatedPluginBanners />
      <Table scrollable>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="w-0" />
            <TableHeaderCell>{t("plugins.displayName")}</TableHeaderCell>
            <TableHeaderCell>{t("plugins.name")}</TableHeaderCell>
            <TableHeaderCell>{t("plugins.version")}</TableHeaderCell>
            <TableHeaderCell />
          </TableRow>
        </TableHead>
        <tbody className="divide-y divide-surface-highlight">
          {plugins.map((p) => (
            <PluginTableRowForInstalledPlugin key={p.id} plugin={p} />
          ))}
        </tbody>
      </Table>
    </div>
  );
}

function DeprecatedPluginBanners() {
  const deprecated = usePluginInfos().filter(
    ({ plugin, info }) => plugin.source !== "bundled" && info.deprecated != null,
  );
  return (
    <div className={classNames("flex flex-col gap-2", deprecated.length > 0 && "pb-3")}>
      {deprecated.map(({ plugin, info }) => (
        <DeprecatedPluginBanner key={plugin.id} plugin={plugin} name={info.displayName}>
          {withInlineCode(info.deprecated ?? "")}
        </DeprecatedPluginBanner>
      ))}
    </div>
  );
}

/** Backtick spans in a package.json string, set as code. */
function withInlineCode(text: string): ReactNode {
  return text
    .split("`")
    .map((part, i) => (i % 2 === 1 ? <InlineCode key={i}>{part}</InlineCode> : part));
}

export function DeprecatedPluginBanner({
  children,
  name,
  plugin,
}: {
  children: ReactNode;
  name: string;
  plugin: Plugin;
}) {
  const uninstall = usePromptUninstallPlugin(plugin.id, name);
  const { t } = useTranslation();
  return (
    <Banner color="info" className="flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <div className="text text-text">{t("plugins.deprecated", { name })}</div>
        <p className="mt-1 text-sm text-text-subtle">{children}</p>
      </div>
      <Button
        size="xs"
        variant="border"
        title={t("plugins.uninstallPlugin")}
        className="shrink-0"
        isLoading={uninstall?.isPending}
        onClick={() => uninstall?.mutate()}
      >
        {t("plugins.uninstall")}
      </Button>
    </Banner>
  );
}

function BundledPlugins({ plugins }: { plugins: Plugin[] }) {
  const { t } = useTranslation();
  return plugins.length === 0 ? (
    <div className="pb-4">
      <EmptyStateText className="text-center">{t("plugins.noBundledFound")}</EmptyStateText>
    </div>
  ) : (
    <Table scrollable>
      <TableHead>
        <TableRow>
          <TableHeaderCell className="w-0" />
          <TableHeaderCell>{t("plugins.displayName")}</TableHeaderCell>
          <TableHeaderCell>{t("plugins.name")}</TableHeaderCell>
          <TableHeaderCell>{t("plugins.version")}</TableHeaderCell>
          <TableHeaderCell />
        </TableRow>
      </TableHead>
      <tbody className="divide-y divide-surface-highlight">
        {plugins.map((p) => (
          <PluginTableRowForBundledPlugin key={p.id} plugin={p} />
        ))}
      </tbody>
    </Table>
  );
}

function usePluginUpdates() {
  return useQuery({
    queryKey: ["plugin_updates", usePluginsKey()],
    queryFn: () => checkPluginUpdates(),
  });
}
