import { addLocalDays, localDayKey, startOfLocalDay, type ActivityEvent, type ActivityStatus } from "../../../shared";

const number = new Intl.NumberFormat();
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const statusLabel: Record<ActivityStatus, string> = {
  filtered: "Filtered",
  revealed: "Revealed",
  incorrect: "Marked incorrect",
};

function HistoryItem({ item, busy, onIncorrect }: { item: ActivityEvent; busy: boolean; onIncorrect: () => void }) {
  return (
    <details className="group border-t border-line py-3 first:border-t-0">
      <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-md focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-offset-(--focus-ring-offset) focus-visible:outline-focus">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-meta text-muted">
            <strong className="text-xs text-ink">{item.author || "Unknown author"}</strong>
            {item.mediaType && <span className="rounded bg-selected px-1.5 py-0.5 capitalize">{item.mediaType}</span>}
            <span>{statusLabel[item.status]}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-[1.65] text-muted">{item.preview || "Content unavailable"}</p>
          <p className="mt-1 text-caption text-faint">{item.policyName || "Matched policy unavailable"}</p>
        </div>
        <time className="text-caption whitespace-nowrap text-muted" dateTime={new Date(item.filteredAt).toISOString()}>
          {timeFormatter.format(item.filteredAt)}
        </time>
      </summary>
      <div className="mt-3 rounded-lg border border-line bg-canvas/50 p-3 text-meta leading-[1.7] text-muted">
        <p className="whitespace-pre-wrap text-ink">{item.preview || "Content unavailable"}</p>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt>Filtered at</dt>
          <dd>{new Date(item.filteredAt).toLocaleString()}</dd>
          <dt>Matched policy</dt>
          <dd>{item.policyName || "Unavailable"}</dd>
        </dl>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {item.url && (
            <a
              className="font-semibold text-ink underline-offset-2 hover:underline"
              href={item.url}
              target="_blank"
              rel="noreferrer"
            >
              View original ↗
            </a>
          )}
          {item.status !== "incorrect" && (
            <button
              className="font-semibold text-danger hover:underline disabled:opacity-50"
              type="button"
              disabled={busy}
              onClick={onIncorrect}
            >
              Not supposed to be filtered
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
  const today = localDayKey(now);
  const yesterday = localDayKey(addLocalDays(startOfLocalDay(now), -1));
  const groups = new Map<string, ActivityEvent[]>();
  for (const item of history) groups.set(item.day, [...(groups.get(item.day) ?? []), item]);
  const groupLabel = (day: string) =>
    day === today
      ? "Today"
      : day === yesterday
        ? "Yesterday"
        : new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { month: "long", day: "numeric" });

  return (
    <section className="rounded-xl border border-line bg-surface p-[18px]" aria-labelledby="history-title">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div>
          <h2 id="history-title" className="text-sm font-semibold">
            Filter History
          </h2>
          <p className="mt-1 text-meta text-muted">最近 30 天 · 按时间倒序</p>
        </div>
        <span className="font-mono text-caption text-muted">{number.format(history.length)} records</span>
      </div>
      {history.length === 0 ? (
        <p className="border-t border-line py-6 text-center text-xs text-muted">No filtering history yet.</p>
      ) : (
        [...groups].map(([day, items]) => (
          <div key={day} className="mt-4 first:mt-2">
            <h3 className="font-mono text-caption font-semibold text-muted">{groupLabel(day)}</h3>
            {items.map((item) => (
              <HistoryItem key={item.id} item={item} busy={busy} onIncorrect={() => onIncorrect(item.id)} />
            ))}
          </div>
        ))
      )}
    </section>
  );
}
