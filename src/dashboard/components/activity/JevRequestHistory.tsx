import type { JevRequestLogEntry } from "../../../shared";
import { cn } from "../../../ui/cn";
import { providerLabel, useI18n, type MessageKey } from "../../../ui/i18n";
import { secondaryButton, tag } from "../../../ui/styles";

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
    <section className="overflow-hidden rounded-xl border border-line bg-surface" aria-labelledby="jev-log-title">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-[18px] sm:p-6">
        <div>
          <h2 id="jev-log-title" className="text-heading text-ink">
            {t("jevLog.title")}
          </h2>
          <p className="mt-1 text-meta text-muted">{t("jevLog.description")}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={tag}>{t("jevLog.records", { count: entries.length })}</span>
          <button
            className={secondaryButton}
            type="button"
            disabled={busy || entries.length === 0}
            onClick={() => void onClear().catch(() => undefined)}
          >
            {busy ? t("jevLog.clearing") : t("jevLog.clear")}
          </button>
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="p-[18px] text-xs text-muted sm:p-6">{t("jevLog.empty")}</p>
      ) : (
        <ol className="divide-y divide-line">
          {entries.map((entry) => (
            <li className="grid gap-3 p-[18px] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6" key={entry.id}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn("size-1.5 rounded-full", entry.status === "success" ? "bg-live" : "bg-danger")}
                    aria-hidden="true"
                  />
                  <strong className="text-xs text-ink">{providerLabel(entry.providerId, locale)}</strong>
                  <span className="font-mono text-caption text-muted">{entry.modelId}</span>
                  <span className={tag}>{t(entry.kind === "health-check" ? "jevLog.health" : "jevLog.review")}</span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  {entry.status === "success" ? t("jevLog.success") : t(errorLabel(entry.errorCode))}
                </p>
                <p className="mt-1 font-mono text-caption text-muted">
                  {t("jevLog.details", {
                    items: number.format(entry.itemCount),
                    questions: number.format(entry.questionCount),
                    duration: number.format(entry.durationMs),
                  })}
                  {entry.surface ? ` · ${t(entry.surface === "timeline" ? "popup.timeline" : "popup.comments")}` : ""}
                </p>
              </div>
              <time
                className="font-mono text-caption text-muted sm:text-right"
                dateTime={new Date(entry.requestedAt).toISOString()}
              >
                {date.format(entry.requestedAt)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
