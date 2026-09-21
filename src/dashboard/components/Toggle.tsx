interface ToggleProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, description, checked, disabled, onChange }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-6 border-b border-line py-[19px]">
      <span>
        <strong className="block text-sm font-semibold">{label}</strong>
        <span className={`${fieldHelp} mt-1 block`}>{description}</span>
      </span>
      <span className={switchShell}>
        <input
          className={switchInput}
          type="checkbox"
          role="switch"
          aria-label={label}
          checked={checked}
          aria-checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className={switchTrack} aria-hidden="true" />
      </span>
    </label>
  );
}
import { fieldHelp, switchInput, switchShell, switchTrack } from "../../ui/styles";
