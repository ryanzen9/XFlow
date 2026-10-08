import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Tooltip } from "@astryxdesign/core/Tooltip";
import { sensitivityForHitRate } from "../../shared";
import { useI18n } from "../../ui/i18n";

const presets = [
  { id: "low", hitRate: 80 },
  { id: "medium", hitRate: 70 },
  { id: "strict", hitRate: 50 },
] as const;

export function HitRatePresets({
  hitRate,
  name,
  disabled,
  onChange,
}: {
  hitRate: number;
  name: string;
  disabled?: boolean;
  onChange: (sensitivity: number) => void;
}) {
  const { t } = useI18n();
  const isWide = useMediaQuery("(min-width: 768px)");
  return (
    <SegmentedControl
      label={t("strategy.hitRateFor", { name })}
      size="md"
      layout="fill"
      value={presets.some((preset) => preset.hitRate === hitRate) ? String(hitRate) : ""}
      isDisabled={disabled}
      onChange={(value) => onChange(sensitivityForHitRate(Number(value)))}
    >
      {presets.map(({ id, hitRate: value }) => (
        <Tooltip
          key={id}
          content={t("strategy.hitRatePreset", { name, level: t(`strategy.hitRate.${id}`), value })}
          isEnabled={!disabled}
        >
          <SegmentedControlItem
            value={String(value)}
            label={isWide ? `${t(`strategy.hitRate.${id}`)} ${value}%` : `${value}%`}
          />
        </Tooltip>
      ))}
    </SegmentedControl>
  );
}
