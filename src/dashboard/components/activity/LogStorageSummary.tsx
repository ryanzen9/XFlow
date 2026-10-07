import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { useState } from "react";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Trash2 } from "lucide-react";
import { HStack } from "@astryxdesign/core/HStack";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useI18n } from "../../../ui/i18n";
import { Panel } from "../DashboardUI";

export function formatBytes(bytes: number, locale: string): string {
  const safeBytes = Math.max(0, bytes);
  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(Math.max(safeBytes, 1)) / Math.log(1024)), units.length - 1);
  const value = safeBytes / 1024 ** unitIndex;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: unitIndex === 0 ? 0 : 1 }).format(value)} ${units[unitIndex]}`;
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
  const [open, setOpen] = useState(false);
  const usagePercent = Math.min(100, (Math.max(0, bytesInUse) / Math.max(storageLimit, 1)) * 100);
  const percentage = new Intl.NumberFormat(locale, { maximumFractionDigits: usagePercent < 1 ? 2 : 1 }).format(
    usagePercent,
  );
  return (
    <Panel id="log-storage-title" title={t("history.storage")}>
      <VStack gap={3}>
        <HStack hAlign="between" gap={3} wrap="wrap">
          <Text type="code">
            {t("history.storageUsed", {
              used: formatBytes(bytesInUse, locale),
              limit: formatBytes(storageLimit, locale),
            })}
          </Text>
          <IconButton
            label={t("history.clear")}
            tooltip={t("history.clear")}
            icon={<Icon icon={Trash2} size="sm" />}
            size="sm"
            variant="ghost"
            isDisabled={busy || recordCount === 0}
            onClick={() => setOpen(true)}
          />
        </HStack>
        <ProgressBar
          label={t("history.storage")}
          value={usagePercent}
          max={100}
          variant="neutral"
          hasValueLabel
          aria-valuetext={t("history.storagePercent", { percent: percentage })}
          formatValueLabel={() => t("history.storagePercent", { percent: percentage })}
        />
      </VStack>
      <AlertDialog
        isOpen={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
        title={t("history.clearTitle")}
        description={t("history.clearDescription")}
        cancelLabel={t("common.cancel")}
        actionLabel={t("history.clearConfirm")}
        isActionLoading={busy}
        onAction={() =>
          void onClear()
            .then(() => setOpen(false))
            .catch(() => undefined)
        }
      />
    </Panel>
  );
}
