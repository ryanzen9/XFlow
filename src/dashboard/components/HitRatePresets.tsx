import { sensitivityForHitRate } from "../../shared";
import { cn } from "../../ui/cn";
import { useI18n } from "../../ui/i18n";
import { focusRing } from "../../ui/styles";

const presets = [
  { id: "low", hitRate: 80 },
  { id: "medium", hitRate: 70 },
  { id: "strict", hitRate: 50 },
] as const;

interface Props {
  hitRate: number;
  name: string;
  disabled?: boolean;
  onChange: (sensitivity: number) => void;
}

export function HitRatePresets({ hitRate, name, disabled, onChange }: Props) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={t("strategy.hitRateFor", { name })}>
      {presets.map(({ id, hitRate: presetHitRate }) => (
        <button
          key={id}
          type="button"
          className={cn(
            focusRing,
            "min-h-8 rounded-sm border border-line-strong bg-surface px-1.5 font-mono text-caption text-ink transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-55",
            hitRate === presetHitRate && "border-action bg-action text-action-fg hover:bg-action-hover",
          )}
          aria-label={t("strategy.hitRatePreset", {
            name,
            level: t(`strategy.hitRate.${id}`),
            value: presetHitRate,
          })}
          aria-pressed={hitRate === presetHitRate}
          disabled={disabled}
          onClick={() => onChange(sensitivityForHitRate(presetHitRate))}
        >
          {t(`strategy.hitRate.${id}`)} {presetHitRate}%
        </button>
      ))}
    </div>
  );
}
