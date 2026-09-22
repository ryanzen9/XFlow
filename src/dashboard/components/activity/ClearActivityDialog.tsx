import { useEffect, useRef, useState } from "react";
import { secondaryButton } from "../../../ui/styles";
import { useI18n } from "../../../ui/i18n";

export function ClearActivityDialog({ busy, onClear }: { busy: boolean; onClear: () => Promise<void> }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const cancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    cancelButton.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy, open]);
  return (
    <>
      <button className={`${secondaryButton} text-danger`} type="button" disabled={busy} onClick={() => setOpen(true)}>
        {t("activity.clearData")}
      </button>
      {open && (
        <div className="fixed inset-0 z-(--layer-dialog) grid place-items-center bg-scrim p-4" role="presentation">
          <section
            className="w-full max-w-md rounded-lg border border-line bg-raised p-5 shadow-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-activity-title"
          >
            <h3 id="clear-activity-title" className="text-base font-semibold">
              {t("activity.clearTitle")}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">{t("activity.clearWarning")}</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted">
              <li>{t("activity.clearHistory")}</li>
              <li>{t("activity.clearWeekly")}</li>
              <li>{t("activity.clearTotal")}</li>
            </ul>
            <div className="mt-5 flex justify-end gap-2">
              <button
                ref={cancelButton}
                className={secondaryButton}
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                {t("common.cancel")}
              </button>
              <button
                className="min-h-9 rounded-md border border-danger-solid bg-danger-solid px-4 text-xs font-semibold text-danger-fg disabled:opacity-50"
                type="button"
                disabled={busy}
                onClick={() =>
                  void onClear()
                    .then(() => setOpen(false))
                    .catch(() => undefined)
                }
              >
                {busy ? t("activity.clearing") : t("common.clear")}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
