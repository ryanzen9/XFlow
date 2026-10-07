import { useRef, type ChangeEventHandler } from "react";
import { HStack } from "@astryxdesign/core/HStack";
import { Item } from "@astryxdesign/core/Item";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { useI18n } from "../../ui/i18n";

export interface MonitorSwitchProps {
  id: string;
  routeLabel: string;
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
  routeLabel,
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
      label={title}
      labelLines={1}
      density="compact"
      interactiveRef={control}
      data-slot={`${id}-filter-control`}
      data-state={state}
      aria-busy={pending}
      description={
        <HStack as="span" gap={2}>
          <Text type="code">{routeLabel}</Text>
          <StatusDot label={stateLabel} variant={pending ? "warning" : "neutral"} aria-hidden="true" />
          <Text id={stateId} type="supporting" aria-live="polite">
            {stateLabel}
          </Text>
        </HStack>
      }
      endContent={
        <Switch
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
