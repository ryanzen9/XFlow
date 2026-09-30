import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
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
  return (
    <SegmentedControl
      label={t("strategy.hitRateFor", { name })}
      size="sm"
      value={presets.some((preset) => preset.hitRate === hitRate) ? String(hitRate) : ""}
      isDisabled={disabled}
      onChange={(value) => onChange(sensitivityForHitRate(Number(value)))}
    >
      {presets.map(({ id, hitRate: value }) => (
        <SegmentedControlItem
          key={id}
          value={String(value)}
          label={`${t(`strategy.hitRate.${id}`)} ${value}%`}
          aria-label={t("strategy.hitRatePreset", { name, level: t(`strategy.hitRate.${id}`), value })}
        />
      ))}
    </SegmentedControl>
  );
}
