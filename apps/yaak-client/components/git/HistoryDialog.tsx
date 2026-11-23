import { useGitLog } from "@yaakapp-internal/git";
import { formatDistanceToNowStrict } from "date-fns";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TruncatedWideTableCell,
} from "@yaakapp-internal/ui";

export function HistoryDialog({ dir }: { dir: string }) {
  const { t } = useTranslation();
  const log = useGitLog(dir);

  return (
    <div className="pl-5 pr-1 pb-1">
      <Table scrollable className="px-1">
        <TableHead>
          <TableRow>
            <TableHeaderCell>{t("git.message")}</TableHeaderCell>
            <TableHeaderCell>{t("git.author")}</TableHeaderCell>
            <TableHeaderCell>{t("git.when")}</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(log.data ?? []).map((l) => (
            <TableRow key={l.oid}>
              <TruncatedWideTableCell>
                {l.message || <em className="text-text-subtle">{t("git.noMessage")}</em>}
              </TruncatedWideTableCell>
              <TableCell>
                <span title={t("git.email", { email: l.author.email })}>{l.author.name || t("git.unknown")}</span>
              </TableCell>
              <TableCell className="text-text-subtle">
                <span title={l.when}>{formatDistanceToNowStrict(l.when)} {t("git.ago")}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
