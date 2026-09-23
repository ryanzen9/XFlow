import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { secondaryButton } from "../../../ui/styles";
import { useI18n } from "../../../ui/i18n";

export function formatBytes(bytes: number, locale: string): string {
  const safeBytes = Math.max(0, bytes);
  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(Math.max(safeBytes, 1)) / Math.log(1024)), units.length - 1);
  const value = safeBytes / 1024 ** unitIndex;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: unitIndex === 0 ? 0 : 1 }).format(value)} ${units[unitIndex]}`;
}

function ClearHistoryDialog({
  busy,
  disabled,
  onClear,
}: {
  busy: boolean;
  disabled: boolean;
  onClear: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const triggerButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const clearButton = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => triggerButton.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    cancelButton.current?.focus();
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !busy) close();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy, close, open]);

  const wrapFocusBackward = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Tab" && event.shiftKey) {
      event.preventDefault();
      clearButton.current?.focus();
    }
  };

  const wrapFocusForward = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Tab" && !event.shiftKey) {
      event.preventDefault();
      cancelButton.current?.focus();
    }
  };

  return (
    <>
      <button
        ref={triggerButton}
        className={`${secondaryButton} text-danger`}
        type="button"
        disabled={busy || disabled}
        onClick={() => setOpen(true)}
      >
        {t("history.clear")}
      </button>
      {open && (
        <div className="fixed inset-0 z-(--layer-dialog) grid place-items-center bg-scrim p-4" role="presentation">
          <section
            className="w-full max-w-md rounded-lg border border-line bg-raised p-5 shadow-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-history-title"
            aria-describedby="clear-history-description"
          >
            <h3 id="clear-history-title" className="text-heading">
              {t("history.clearTitle")}
            </h3>
            <p id="clear-history-description" className="mt-2 text-xs leading-relaxed text-muted">
              {t("history.clearDescription")}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                ref={cancelButton}
                className={secondaryButton}
                type="button"
                disabled={busy}
                onClick={close}
                onKeyDown={wrapFocusBackward}
              >
                {t("common.cancel")}
              </button>
              <button
                ref={clearButton}
                className="min-h-9 rounded-md border border-danger-solid bg-danger-solid px-4 text-label text-danger-fg disabled:opacity-50"
                type="button"
                disabled={busy}
                onClick={() =>
                  void onClear()
                    .then(close)
                    .catch(() => undefined)
                }
                onKeyDown={wrapFocusForward}
              >
                {busy ? t("history.clearing") : t("history.clearConfirm")}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export function LogStorageSummary({
  bytesInUse,
  storageLimit,
  recordCount,
  busy,
  onClear,
}: {
  bytesInUse: number;
  storageLimit: number;
  recordCount: number;
  busy: boolean;
  onClear: () => Promise<void>;
}) {
  const { locale, t } = useI18n();
  const safeLimit = Math.max(storageLimit, 1);
  const usagePercent = Math.min(100, (bytesInUse / safeLimit) * 100);
  const visualStyle = { "--usage-percent": `${usagePercent}%` } as CSSProperties;
  const percentage = new Intl.NumberFormat(locale, { maximumFractionDigits: usagePercent < 1 ? 2 : 1 }).format(
    usagePercent,
  );

  return (
    <section className="rounded-xl border border-line bg-surface p-[18px]" aria-labelledby="log-storage-title">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 id="log-storage-title" className="text-sm font-semibold">
                {t("history.storage")}
              </h2>
              <p className="mt-1 text-meta text-muted">{t("history.storageDescription")}</p>
            </div>
            <span className="shrink-0 font-mono text-caption text-muted">
              {t("history.storageUsed", {
                used: formatBytes(bytesInUse, locale),
                limit: formatBytes(storageLimit, locale),
              })}
            </span>
          </div>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-inset"
            role="progressbar"
            aria-label={t("history.storage")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Number(usagePercent.toFixed(2))}
            aria-valuetext={t("history.storagePercent", { percent: percentage })}
          >
            <div className="h-full w-[var(--usage-percent)] rounded-full bg-ink" style={visualStyle} />
          </div>
        </div>
        <ClearHistoryDialog busy={busy} disabled={recordCount === 0} onClear={onClear} />
      </div>
    </section>
  );
}
