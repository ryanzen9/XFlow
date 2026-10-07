import { Button } from "@astryxdesign/core/Button";
import { List, ListItem } from "@astryxdesign/core/List";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import type { JevRequestLogEntry } from "../../../shared";
import { providerLabel, useI18n, type MessageKey } from "../../../ui/i18n";
import { Panel } from "../DashboardUI";

interface Props {
  entries: JevRequestLogEntry[];
  busy: boolean;
  onClear: () => Promise<void>;
}

function errorLabel(errorCode: JevRequestLogEntry["errorCode"]): MessageKey {
  return `api.healthError.${errorCode ?? "provider"}` as MessageKey;
}

export function JevRequestHistory({ entries, busy, onClear }: Props) {
  const { locale, t } = useI18n();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "medium" });
  const number = new Intl.NumberFormat(locale);

  return (
    <Panel
      id="jev-log-title"
      title={t("jevLog.title")}
      description={t("jevLog.description")}
      actions={
        <Button
          label={t("jevLog.clear")}
          size="sm"
          isLoading={busy}
          isDisabled={busy || entries.length === 0}
          onClick={() => void onClear().catch(() => undefined)}
        />
      }
    >
      {entries.length === 0 ? (
        <Text as="p" color="secondary">
          {t("jevLog.empty")}
        </Text>
      ) : (
        <List header={t("jevLog.records", { count: entries.length })} density="compact" hasDividers>
          {entries.map((entry) => {
            const outcome = entry.status === "success" ? t("jevLog.success") : t(errorLabel(entry.errorCode));
            return (
              <ListItem
                key={entry.id}
                label={`${providerLabel(entry.providerId, locale)} · ${t(entry.kind === "health-check" ? "jevLog.health" : "jevLog.review")}`}
                startContent={<StatusDot label={outcome} variant={entry.status === "success" ? "success" : "error"} />}
                description={
                  <VStack gap={1} className="min-w-0">
                    <Text type="supporting" className="break-words">
                      {entry.modelId} · {outcome}
                    </Text>
                    <Text type="supporting" className="tabular-nums">
                      {t("jevLog.details", {
                        items: number.format(entry.itemCount),
                        questions: number.format(entry.questionCount),
                        duration: number.format(entry.durationMs),
                      })}
                      {entry.surface
                        ? ` · ${t(entry.surface === "timeline" ? "popup.timeline" : "popup.comments")}`
                        : ""}
                    </Text>
                    <Text type="supporting" color="secondary">
                      <time dateTime={new Date(entry.requestedAt).toISOString()}>{date.format(entry.requestedAt)}</time>
                    </Text>
                  </VStack>
                }
              />
            );
          })}
        </List>
      )}
    </Panel>
  );
}
