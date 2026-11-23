import { i18n } from "@yaakapp-internal/i18n";
import { Button, FormattedError, Heading, VStack } from "@yaakapp-internal/ui";
import { DetailsBanner } from "./core/DetailsBanner";

export default function RouteError({ error }: { error: unknown }) {
  console.log("Error", error);
  const stringified = JSON.stringify(error);
  // oxlint-disable-next-line no-explicit-any -- none
  const message = (error as any).message ?? stringified;
  const stack =
    typeof error === "object" && error != null && "stack" in error ? String(error.stack) : null;
  return (
    <div className="flex items-center justify-center h-full">
      <VStack space={5} className="w-200 h-auto!">
        <Heading>{i18n.t("common.routeError")}</Heading>
        <FormattedError>
          {message}
          {stack && (
            <DetailsBanner
              color="secondary"
              className="mt-3 select-auto text-xs max-h-[40vh]"
              summary={i18n.t("common.stackTrace")}
            >
              <div className="mt-2 text-xs">{stack}</div>
            </DetailsBanner>
          )}
        </FormattedError>
        <VStack space={2}>
          <Button
            color="primary"
            onClick={async () => {
              window.location.assign("/");
            }}
          >
            {i18n.t("common.goHome")}
          </Button>
          <Button color="info" onClick={() => window.location.reload()}>
            {i18n.t("common.refresh")}
          </Button>
        </VStack>
      </VStack>
    </div>
  );
}
