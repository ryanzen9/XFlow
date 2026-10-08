import { Text } from "@astryxdesign/core/Text";
import { HStack } from "@astryxdesign/core/HStack";
import { StackItem } from "@astryxdesign/core/Stack";
import { useI18n } from "../../ui/i18n";

export function ModelFooter({ modelId }: { modelId: string }) {
  const { t } = useI18n();
  return (
    <HStack as="footer" gap={2}>
      <Text type="supporting">{t("popup.decisionModel")}</Text>
      <StackItem size="fill">
        <Text type="supporting" maxLines={1} justify="end">
          {modelId}
        </Text>
      </StackItem>
    </HStack>
  );
}
