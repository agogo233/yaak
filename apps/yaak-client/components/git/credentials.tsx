import { i18n } from "@yaakapp-internal/i18n";
import { showPromptForm } from "../../lib/prompt-form";
import { Banner, InlineCode } from "@yaakapp-internal/ui";

export interface GitCredentials {
  username: string;
  password: string;
}

export async function promptCredentials({
  url: remoteUrl,
  error,
}: {
  url: string;
  error: string | null;
}): Promise<GitCredentials | null> {
  const isGitHub = /github\.com/i.test(remoteUrl);
  const userLabel = isGitHub ? i18n.t("git.githubUsername") : i18n.t("git.username");
  const passLabel = isGitHub ? i18n.t("git.githubPat") : i18n.t("git.passwordOrToken");
  const userDescription = isGitHub ? i18n.t("git.githubUsernameDescription") : undefined;
  const passDescription = isGitHub
    ? i18n.t("git.githubPatDescription")
    : i18n.t("git.passwordDescription");
  const r = await showPromptForm({
    id: "git-credentials",
    title: i18n.t("git.credentialsRequired"),
    description: error ? (
      <Banner color="danger">{error}</Banner>
    ) : (
      <>
        {i18n.t("git.enterCredentialsFor")} <InlineCode>{remoteUrl}</InlineCode>
      </>
    ),
    inputs: [
      { type: "text", name: "username", label: userLabel, description: userDescription },
      {
        type: "text",
        name: "password",
        label: passLabel,
        description: passDescription,
        password: true,
      },
    ],
  });
  if (r == null) return null;

  const username = String(r.username || "");
  const password = String(r.password || "");
  return { username, password };
}
