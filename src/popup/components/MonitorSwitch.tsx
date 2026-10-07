import { useRef, type ChangeEventHandler } from "react";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import { useI18n } from "../../ui/i18n";

export interface MonitorSwitchProps {
  id: string;
  title: string;
  ariaLabel: string;
  checked: boolean;
  disabled?: boolean;
  pending?: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

/** The row delegates clicks to its single, labelled switch. */
export function MonitorSwitch({
  id,
  title,
  ariaLabel,
  checked,
  disabled,
  pending = false,
  onChange,
}: MonitorSwitchProps) {
  const { t } = useI18n();
  const control = useRef<HTMLInputElement>(null);
  const stateId = `${id}-state`;
  const state = pending ? "pending" : checked ? "on" : "off";
  const stateLabel = t(pending ? "popup.syncing" : checked ? "common.enabled" : "popup.paused");
  return (
    <Item
      label={
        <HStack gap={2}>
          <Text weight="medium" maxLines={1}>
            {title}
          </Text>
          <VisuallyHidden id={stateId} aria-live="polite">
            {stateLabel}
          </VisuallyHidden>
        </HStack>
      }
      labelLines={1}
      density="balanced"
      className="min-h-12 p-0"
      interactiveRef={control}
      data-slot={`${id}-filter-control`}
      data-state={state}
      aria-busy={pending}
      description={pending ? <Text type="supporting">{stateLabel}</Text> : undefined}
      endContent={
        <Switch
          className="flex min-h-11 items-center [&_input]:min-h-11"
          ref={control}
          id={id}
          label={ariaLabel}
          description={stateLabel}
          isLabelHidden
          value={checked}
          isDisabled={disabled}
          isLoading={pending}
          onChange={(_, event) => onChange(event)}
        />
      }
    />
  );
}
