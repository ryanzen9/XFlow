import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { PROVIDERS, type AppSettings } from "../../shared";
import { providerLabel, useI18n } from "../../ui/i18n";
import { ActivityPanel } from "./ActivityPanel";
import { Actions, Panel } from "./DashboardUI";
import { Toggle } from "./Toggle";

interface Props {
  settings: AppSettings;
  busy: boolean;
  onChange: (patch: Partial<AppSettings>) => void;
  onToggle: (key: "enabled" | "commentsEnabled", checked: boolean) => void;
  onSave: () => void;
}

export function GeneralPanel({ settings, busy, onChange, onToggle, onSave }: Props) {
  const { locale, t } = useI18n();
  return (
    <VStack gap={8}>
      <ActivityPanel />
      <Divider />
      <Panel title={t("general.scope")} description={t("general.scopeDescription")}>
        <Toggle
          label={t("general.homeTimeline")}
          description={t("general.homeDescription")}
          checked={settings.enabled}
          disabled={busy}
          onChange={(checked) => onToggle("enabled", checked)}
        />
        <Toggle
          label={t("general.comments")}
          description={t("general.commentsDescription")}
          checked={settings.commentsEnabled}
          disabled={busy}
          onChange={(checked) => onToggle("commentsEnabled", checked)}
        />
        <Text as="p" color="secondary">
          {t("general.pauseHelp")}
        </Text>
      </Panel>
      <Divider />
      <VStack
        as="form"
        gap={4}
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <Panel title={t("general.modelDisplay")} description={t("general.modelDisplayDescription")}>
          <FormLayout>
            <TextInput
              data-field="model-nickname"
              label={t("general.modelNickname")}
              description={t("general.modelNicknameHelp")}
              value={settings.modelNickname}
              isRequired
              isDisabled={busy}
              onChange={(value) => onChange({ modelNickname: value.slice(0, 40) })}
            />
          </FormLayout>
          <Text as="p" color="secondary">
            {t("general.currentModel")} · {providerLabel(settings.activeProvider, locale)}
          </Text>
          <Text type="code">{PROVIDERS[settings.activeProvider].modelId}</Text>
          <Actions>
            <Button type="submit" variant="primary" label={t("general.save")} isLoading={busy} />
          </Actions>
        </Panel>
      </VStack>
    </VStack>
  );
}
