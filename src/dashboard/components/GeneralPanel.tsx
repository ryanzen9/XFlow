import { Divider } from "@astryxdesign/core/Divider";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { type AppSettings } from "../../shared";
import { useI18n } from "../../ui/i18n";
import { SettingsGroup } from "./SettingsGroup";
import { Toggle } from "./Toggle";

interface Props {
  settings: AppSettings;
  busy: boolean;
  onChange: (patch: Partial<AppSettings>) => void;
  onToggle: (key: "enabled" | "commentsEnabled", checked: boolean) => void;
  onSave: () => void;
}

export function GeneralPanel({ settings, busy, onChange, onToggle, onSave }: Props) {
  const { t } = useI18n();
  return (
    <VStack gap={8}>
      <SettingsGroup title={t("general.scope")} id="filter-scope-title">
        <Toggle
          label={t("general.homeTimeline")}
          checked={settings.enabled}
          disabled={busy}
          onChange={(checked) => onToggle("enabled", checked)}
        />
        <Toggle
          label={t("general.comments")}
          checked={settings.commentsEnabled}
          disabled={busy}
          onChange={(checked) => onToggle("commentsEnabled", checked)}
        />
      </SettingsGroup>
      <Divider />
      <VStack
        as="form"
        id="general-settings"
        gap={4}
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <SettingsGroup title={t("general.modelDisplay")} id="model-display-title">
          <FormLayout>
            <TextInput
              data-field="model-nickname"
              label={t("general.modelNickname")}
              labelTooltip={t("general.modelNicknameHelp")}
              value={settings.modelNickname}
              isRequired
              isDisabled={busy}
              onChange={(value) => onChange({ modelNickname: value.slice(0, 40) })}
            />
          </FormLayout>
        </SettingsGroup>
      </VStack>
    </VStack>
  );
}
