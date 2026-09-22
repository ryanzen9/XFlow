import { useEffect, useRef, useState } from "react";
import { secondaryButton } from "../../../ui/styles";

export function ClearActivityDialog({ busy, onClear }: { busy: boolean; onClear: () => Promise<void> }) {
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
      <button className={`${secondaryButton} text-alert`} type="button" disabled={busy} onClick={() => setOpen(true)}>
        Clear Activity Data
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" role="presentation">
          <section
            className="w-full max-w-md rounded-xl border border-line bg-panel p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-activity-title"
          >
            <h3 id="clear-activity-title" className="text-base font-semibold">
              Clear Activity Data?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">This action cannot be undone. It will remove:</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted">
              <li>Activity history, Heatmap and Trend data</li>
              <li>Weekly reviews and Filter History</li>
              <li>Total filtered count</li>
            </ul>
            <div className="mt-5 flex justify-end gap-2">
              <button
                ref={cancelButton}
                className={secondaryButton}
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                className="min-h-9 rounded-lg border border-alert bg-alert px-4 text-xs font-semibold text-white disabled:opacity-50"
                type="button"
                disabled={busy}
                onClick={() =>
                  void onClear()
                    .then(() => setOpen(false))
                    .catch(() => undefined)
                }
              >
                {busy ? "Clearing…" : "Clear"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
