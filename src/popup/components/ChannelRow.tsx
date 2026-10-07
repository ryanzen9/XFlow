import { Item } from "@astryxdesign/core/Item";
import { Text } from "@astryxdesign/core/Text";
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
      label={
        <Text weight="medium" maxLines={1}>
          {name}
        </Text>
      }
      labelLines={1}
      endContent={
        <Text type="supporting" className="shrink-0">
          {status}
        </Text>
      }
      density="balanced"
      className="min-h-10 px-0"
      data-state={configured ? "configured" : "empty"}
    />
  );
}
