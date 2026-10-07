import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
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
      <VStack as="main" minHeight="var(--xflow-popup-height)" padding={3} gap={2} className="bg-body">
        <HStack as="header" gap={2} hAlign="between">
          <HStack gap={2}>
            <Avatar
              src={form.theme === "dark" ? "logo.png" : "logo-dark.png"}
              name="XFlow"
              alt="XFlow logo"
              size="sm"
            />
            <Heading level={4} accessibilityLevel={1}>
              XFlow
            </Heading>
          </HStack>
          <AppearanceControls theme={form.theme} onThemeChange={(theme) => void form.setTheme(theme)} />
        </HStack>
        <ActivitySummary {...activity} live={form.enabled || form.commentsEnabled} />
        <VStack as="section" gap={1} aria-label={t("popup.monitoringScope")}>
          <VStack className="divide-y divide-border rounded-lg border border-border">
            <MonitorSwitch
              id="enabled"
              routeLabel="/home"
              title={t("popup.timeline")}
              ariaLabel={t("popup.timelineAria")}
              checked={form.enabled}
              disabled={!form.settingsReady || form.enabledPending}
              pending={form.enabledPending}
              onChange={(event) => void form.setEnabled(event.currentTarget.checked)}
            />
            <MonitorSwitch
              id="comments-enabled"
              routeLabel="/status"
              title={t("popup.comments")}
              ariaLabel={t("popup.commentsAria")}
              checked={form.commentsEnabled}
              disabled={!form.settingsReady || form.commentsEnabledPending}
              pending={form.commentsEnabledPending}
              onChange={(event) => void form.setCommentsEnabled(event.currentTarget.checked)}
            />
          </VStack>
        </VStack>
        <VStack as="section" gap={1} aria-label={t("popup.currentProvider")}>
          <VStack className="rounded-lg border border-border">
            <ChannelRow name={providerLabel(form.activeProvider, locale)} configured={form.configured} />
          </VStack>
        </VStack>
        <VStack minHeight="calc(var(--spacing-4) * 2)">
          <Text
            as="p"
            id="save-status"
            type="supporting"
            className={form.status.tone === "error" ? "text-error" : undefined}
            role="status"
            aria-live="polite"
          >
            {form.status.message}
          </Text>
        </VStack>
        <StackItem size="fill" />
        <VStack gap={2}>
          <Divider />
          <ModelFooter modelId={form.modelId} />
          <HStack gap={2}>
            <StackItem size="fill">
              <Button
                label={t("popup.dashboard")}
                width="100%"
                size="sm"
                onClick={() => void chrome.runtime.openOptionsPage()}
              />
            </StackItem>
          </HStack>
        </VStack>
      </VStack>
    </AstryxLocale>
  );
}
