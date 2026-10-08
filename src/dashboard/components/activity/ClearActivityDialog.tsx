import { useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Trash2 } from "lucide-react";
import { useI18n } from "../../../ui/i18n";

export function ClearActivityDialog({ busy, onClear }: { busy: boolean; onClear: () => Promise<void> }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        label={t("activity.clearData")}
        tooltip={t("activity.clearData")}
        icon={<Icon icon={Trash2} size="sm" />}
        size="sm"
        variant="ghost"
        isDisabled={busy}
        onClick={() => setOpen(true)}
      />
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
