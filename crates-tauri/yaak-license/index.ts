import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsAtom } from "@yaakapp-internal/models";
import { platform } from "@yaakapp-internal/platform";
import { appInfo } from "@yaakapp/yaak-client/lib/appInfo";
import { getDefaultStore, useAtomValue } from "jotai";
import { useEffect } from "react";
import { LicenseCheckStatus } from "./bindings/license";

export * from "./bindings/license";

const CHECK_QUERY_KEY = ["license.check"];

/**
 * Whether an automatic license check may reach the network. Off by default, so the app stays
 * offline until the user turns license checks on; activating a license still talks to the
 * server, since that is the user's own action.
 */
function licenseCheckEnabled(): boolean {
  if (!appInfo.featureLicense) {
    return false;
  }
  const settings = getDefaultStore().get(settingsAtom);
  return settings?.checkLicense ?? false;
}

export async function checkLicense(): Promise<LicenseCheckStatus | null> {
  if (!licenseCheckEnabled()) {
    return null;
  }
  return platform.rpc<LicenseCheckStatus>("plugin:yaak-license|check");
}

export function useLicense() {
  const queryClient = useQueryClient();
  const settings = useAtomValue(settingsAtom);
  const checkEnabled = settings?.checkLicense ?? false;

  const activate = useMutation<void, string, { licenseKey: string }>({
    mutationKey: ["license.activate"],
    mutationFn: (payload) => platform.rpc("plugin:yaak-license|activate", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHECK_QUERY_KEY }),
  });

  const deactivate = useMutation<void, string, void>({
    mutationKey: ["license.deactivate"],
    mutationFn: () => platform.rpc("plugin:yaak-license|deactivate"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHECK_QUERY_KEY }),
  });

  // Check the license again after a license is activated
  useEffect(() => {
    return platform.listen("license-activated", () => {
      void queryClient.invalidateQueries({ queryKey: CHECK_QUERY_KEY });
    });
  }, []);

  const check = useQuery<LicenseCheckStatus | null, string>({
    refetchInterval: 1000 * 60 * 60 * 12, // Refetch every 12 hours
    refetchOnWindowFocus: false,
    queryKey: [...CHECK_QUERY_KEY, checkEnabled],
    queryFn: async () => {
      if (!checkEnabled) {
        return null;
      }
      return checkLicense();
    },
  });

  return {
    activate,
    deactivate,
    check,
  } as const;
}
