import { useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { useI18n } from "../../../ui/i18n";

export function ClearActivityDialog({ busy, onClear }: { busy: boolean; onClear: () => Promise<void> }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button label={t("activity.clearData")} variant="secondary" isDisabled={busy} onClick={() => setOpen(true)} />
      <AlertDialog
        isOpen={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
        title={t("activity.clearTitle")}
        description={[
          t("activity.clearWarning"),
          t("activity.clearHistory"),
          t("activity.clearWeekly"),
          t("activity.clearTotal"),
        ].join(" ")}
        cancelLabel={t("common.cancel")}
        actionLabel={t("common.clear")}
        isActionLoading={busy}
        onAction={() =>
          void onClear()
            .then(() => setOpen(false))
            .catch(() => undefined)
        }
      />
    </>
  );
}
