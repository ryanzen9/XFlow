import { Switch } from "@astryxdesign/core/Switch";

export function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Switch
      label={label}
      description={description}
      value={checked}
      isDisabled={disabled}
      onChange={onChange}
      labelPosition="start"
      labelSpacing="spread"
      width="100%"
    />
  );
}
