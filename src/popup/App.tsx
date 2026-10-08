import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { ArrowUpRight } from "lucide-react";
import { AstryxLocale } from "../ui/AstryxLocale";
import { AppearanceControls } from "../ui/AppearanceControls";
import { providerLabel, useI18n } from "../ui/i18n";
import { ActivitySummary } from "./components/ActivitySummary";
import { ChannelRow } from "./components/ChannelRow";
import { ModelFooter } from "./components/ModelFooter";
import { MonitorSwitch } from "./components/MonitorSwitch";
import { useActivity } from "./hooks/use-activity";
import { useSettingsForm } from "./hooks/use-settings-form";

export function App() {
  const form = useSettingsForm();
  const activity = useActivity();
  const { locale, t } = useI18n();
  return (
    <AstryxLocale>
      <VStack as="main" minHeight="var(--xflow-popup-height)" padding={4} gap={3} className="bg-surface">
        <HStack as="header" gap={2} hAlign="between">
          <HStack gap={2}>
            <Avatar
              src={form.theme === "dark" ? "logo.png" : "logo-dark.png"}
              name="XFlow"
              alt="XFlow logo"
              size="sm"
            />
            <Heading level={3} accessibilityLevel={1}>
              XFlow
            </Heading>
          </HStack>
          <AppearanceControls theme={form.theme} onThemeChange={(theme) => void form.setTheme(theme)} />
        </HStack>
        <ActivitySummary {...activity} live={form.enabled || form.commentsEnabled} />
        <VStack as="section" gap={0} aria-label={t("popup.monitoringScope")}>
          <MonitorSwitch
            id="enabled"
            title={t("popup.timeline")}
            ariaLabel={t("popup.timelineAria")}
            checked={form.enabled}
            disabled={!form.settingsReady || form.enabledPending}
            pending={form.enabledPending}
            onChange={(event) => void form.setEnabled(event.currentTarget.checked)}
          />
          <Divider />
          <MonitorSwitch
            id="comments-enabled"
            title={t("popup.comments")}
            ariaLabel={t("popup.commentsAria")}
            checked={form.commentsEnabled}
            disabled={!form.settingsReady || form.commentsEnabledPending}
            pending={form.commentsEnabledPending}
            onChange={(event) => void form.setCommentsEnabled(event.currentTarget.checked)}
          />
        </VStack>
        <VStack as="section" gap={0} aria-label={t("popup.currentProvider")}>
          <Divider />
          <ChannelRow name={providerLabel(form.activeProvider, locale)} configured={form.configured} />
        </VStack>
        <VStack gap={2} className="mt-auto">
          <Divider />
          <ModelFooter modelId={form.modelId} />
          <Text
            as="p"
            id="save-status"
            type="supporting"
            className={form.status.tone === "error" ? "text-error" : "sr-only"}
            role="status"
            aria-live="polite"
          >
            {form.status.message}
          </Text>
          <Button
            label={t("popup.dashboard")}
            width="100%"
            variant="primary"
            className="min-h-10"
            endContent={<Icon icon={ArrowUpRight} size="sm" />}
            onClick={() => void chrome.runtime.openOptionsPage()}
          />
        </VStack>
      </VStack>
    </AstryxLocale>
  );
}
