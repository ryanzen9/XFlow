import { Item } from "@astryxdesign/core/Item";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { useI18n } from "../../ui/i18n";

export interface ChannelRowProps {
  name: string;
  configured: boolean;
}

/** Credentials themselves never render here. */
export function ChannelRow({ name, configured }: ChannelRowProps) {
  const { t } = useI18n();
  const status = t(configured ? "popup.configured" : "popup.needsKey");
  return (
    <Item
      label={name}
      labelLines={1}
      description={status}
      endContent={<StatusDot label={status} variant={configured ? "neutral" : "warning"} aria-hidden="true" />}
      density="compact"
      data-state={configured ? "configured" : "empty"}
    />
  );
}
