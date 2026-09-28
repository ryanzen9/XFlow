import { useState } from "react";
import { addLocalDays, localDayKey, startOfLocalDay, type ActivityEvent, type ActivityStatus } from "../../../shared";
import { useI18n } from "../../../ui/i18n";
import { focusRing } from "../../../ui/styles";

export const HISTORY_PAGE_SIZE = 10;

export function stepHistoryPage(requestedPage: number, totalPages: number, offset: -1 | 1): number {
  const page = Math.min(requestedPage, totalPages);
  return Math.max(1, Math.min(totalPages, page + offset));
}

function HistoryItem({ item, busy, onIncorrect }: { item: ActivityEvent; busy: boolean; onIncorrect: () => void }) {
  const { locale, t } = useI18n();
  const timeFormatter = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" });
  const statusLabel: Record<ActivityStatus, string> = {
    filtered: t("history.filtered"),
    revealed: t("history.revealed"),
    incorrect: t("history.incorrect"),
  };
  return (
    <details className="group border-b border-line">
      <summary className="grid min-h-13 cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md py-2 focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-offset-(--focus-ring-offset) focus-visible:outline-focus sm:grid-cols-[auto_minmax(0,1fr)_minmax(5rem,7rem)_minmax(6rem,8rem)_auto]">
        <time
          className="font-mono text-caption whitespace-nowrap text-muted"
          dateTime={new Date(item.filteredAt).toISOString()}
        >
          {timeFormatter.format(item.filteredAt)}
        </time>
        <span className="min-w-0 truncate text-xs text-ink">{item.preview || t("history.contentUnavailable")}</span>
        <span className="hidden truncate text-meta text-muted sm:block">
          {item.author || t("history.unknownAuthor")}
        </span>
        <span className="hidden truncate text-meta text-muted sm:block">
          {item.policyName || t("history.policyUnavailable")}
        </span>
        <span className="text-caption whitespace-nowrap text-muted group-open:text-ink">
          {statusLabel[item.status]} <span aria-hidden="true">⌄</span>
        </span>
      </summary>
      <div className="mt-3 rounded-lg border border-line bg-canvas/50 p-3 text-meta leading-[1.7] text-muted">
        <p className="whitespace-pre-wrap text-ink">{item.preview || t("history.contentUnavailable")}</p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt>{t("history.filteredAt")}</dt>
          <dd>{new Date(item.filteredAt).toLocaleString(locale)}</dd>
          <dt>{t("history.matchedPolicy")}</dt>
          <dd>{item.policyName || t("common.unavailable")}</dd>
          <dt>{t("history.author")}</dt>
          <dd>{item.author || t("history.unknownAuthor")}</dd>
          {item.mediaType && (
            <>
              <dt>{t("history.mediaType")}</dt>
              <dd className="capitalize">{item.mediaType}</dd>
            </>
          )}
        </dl>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {item.url && (
            <a
              className="font-semibold text-ink underline-offset-2 hover:underline"
              href={item.url}
              target="_blank"
              rel="noreferrer"
            >
              {t("history.viewOriginal")}
            </a>
          )}
          {item.status !== "incorrect" && (
            <button
              className="font-semibold text-danger hover:underline disabled:opacity-50"
              type="button"
              disabled={busy}
              onClick={onIncorrect}
            >
              {t("history.markIncorrect")}
            </button>
          )}
        </div>
      </div>
    </details>
  );
}

export function FilterHistory({
  history,
  now,
  busy,
  onIncorrect,
}: {
  history: ActivityEvent[];
  now: number;
  busy: boolean;
  onIncorrect: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const number = new Intl.NumberFormat(locale);
  const [requestedPage, setRequestedPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const pageStart = (page - 1) * HISTORY_PAGE_SIZE;
  const visibleHistory = history.slice(pageStart, pageStart + HISTORY_PAGE_SIZE);
  const today = localDayKey(now);
  const yesterday = localDayKey(addLocalDays(startOfLocalDay(now), -1));
  const groups = new Map<string, ActivityEvent[]>();
  for (const item of visibleHistory) groups.set(item.day, [...(groups.get(item.day) ?? []), item]);
  const groupLabel = (day: string) =>
    day === today
      ? t("history.today")
      : day === yesterday
        ? t("history.yesterday")
        : new Date(`${day}T12:00:00`).toLocaleDateString(locale, { month: "long", day: "numeric" });

  return (
    <section aria-labelledby="history-title">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 id="history-title" className="text-sm font-semibold">
            {t("history.title")}
          </h2>
          <p className="mt-1 text-meta text-muted">{t("history.subtitle")}</p>
        </div>
        <span className="font-mono text-caption text-muted">
          {t("history.records", { count: number.format(history.length) })}
        </span>
      </div>
      {history.length === 0 ? (
        <p className="border-t border-line py-6 text-center text-xs text-muted">{t("history.empty")}</p>
      ) : (
        <>
          <div className="border-t border-line">
            {[...groups].map(([day, items]) => (
              <div key={day} className="mt-5 first:mt-3">
                <div className="flex items-baseline justify-between gap-3 pb-2">
                  <h3 className="font-mono text-caption font-semibold text-ink">{groupLabel(day)}</h3>
                  <span className="font-mono text-caption text-muted">
                    {t("history.records", { count: number.format(items.length) })}
                  </span>
                </div>
                {items.map((item) => (
                  <HistoryItem key={item.id} item={item} busy={busy} onIncorrect={() => onIncorrect(item.id)} />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="font-mono text-caption text-muted" aria-live="polite">
              {t("history.range", {
                start: number.format(pageStart + 1),
                end: number.format(Math.min(pageStart + HISTORY_PAGE_SIZE, history.length)),
                total: number.format(history.length),
              })}
            </p>
            {totalPages > 1 && (
              <nav className="flex items-center gap-2" aria-label={t("history.pagination")}>
                <button
                  className={`${focusRing} min-h-(--control-height) rounded-md border border-line-strong bg-surface px-3 text-label text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-55`}
                  type="button"
                  disabled={page === 1}
                  onClick={() => setRequestedPage((current) => stepHistoryPage(current, totalPages, -1))}
                >
                  {t("history.previous")}
                </button>
                <span className="min-w-20 text-center font-mono text-caption text-muted">
                  {t("history.page", { current: number.format(page), total: number.format(totalPages) })}
                </span>
                <button
                  className={`${focusRing} min-h-(--control-height) rounded-md border border-line-strong bg-surface px-3 text-label text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-55`}
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setRequestedPage((current) => stepHistoryPage(current, totalPages, 1))}
                >
                  {t("history.next")}
                </button>
              </nav>
            )}
          </div>
        </>
      )}
    </section>
  );
}
