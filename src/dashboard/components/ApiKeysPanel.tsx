import { useEffect, useState } from "react";
import { PROVIDERS, PROVIDER_IDS, type AppSettings, type ProviderId, type ProviderSummary } from "../../shared";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Eye, EyeOff } from "lucide-react";
import { StackItem } from "@astryxdesign/core/Stack";
import { Link } from "@astryxdesign/core/Link";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";

import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Actions, LabeledValue, SectionIntro, Status } from "./DashboardUI";
import { providerLabel, translate, useI18n, type Locale, type MessageKey } from "../../ui/i18n";
import { privacyPolicyUrl } from "../../ui/privacy";
import {
  clearProviderCredential,
  checkProviderCredential,
  loadProviderSummaries,
  ProviderCredentialError,
  saveProviderCredential,
} from "../services/provider-credentials";

interface Props {
  settings: AppSettings;
  busy: boolean;
  onProviderChange: (providerId: ProviderId) => Promise<boolean>;
  onStatus: (status: { message: string; error: boolean }) => void;
}

const emptyDrafts = (): Record<ProviderId, string> => ({
  openrouter: "",
  "vercel-ai-gateway": "",
  typesafe: "",
});

function credentialErrorMessage(locale: Locale, error: unknown, fallback: MessageKey): string {
  const key =
    error instanceof ProviderCredentialError && error.code === "FORBIDDEN"
      ? "api.forbidden"
      : error instanceof ProviderCredentialError && error.code === "INVALID_REQUEST"
        ? "api.invalidRequest"
        : fallback;
  return translate(locale, key);
}

export function ApiKeysPanel({ settings, busy, onProviderChange, onStatus }: Props) {
  const { locale, t } = useI18n();
  const [summaries, setSummaries] = useState<ProviderSummary[]>([]);
  const [drafts, setDrafts] = useState(emptyDrafts);
  const [revealed, setRevealed] = useState<Record<ProviderId, boolean>>({
    openrouter: false,
    "vercel-ai-gateway": false,
    typesafe: false,
  });
  const [pending, setPending] = useState<ProviderId | null>(null);
  const [healthPending, setHealthPending] = useState<ProviderId | null>(null);
  const activeProviderId = settings.activeProvider;
  const activeProvider = PROVIDERS[activeProviderId];
  const activeSummary = summaries.find((summary) => summary.id === activeProviderId);
  const isPending = pending === activeProviderId;
  const credentialsBusy = busy || pending !== null || healthPending !== null;
  const placeholder =
    activeProviderId === "openrouter"
      ? t("api.placeholder.openrouter")
      : activeProviderId === "vercel-ai-gateway"
        ? t("api.placeholder.vercel")
        : t("api.placeholder.typesafe");

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const next = await loadProviderSummaries();
        if (live) setSummaries(next);
      } catch (error) {
        if (live) {
          onStatus({ message: credentialErrorMessage(locale, error, "api.readError"), error: true });
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [locale, onStatus]);

  const saveKey = async (providerId: ProviderId) => {
    const key = drafts[providerId].trim();
    if (!key) {
      onStatus({ message: t("api.enterKey", { provider: providerLabel(providerId, locale) }), error: true });
      document.querySelector<HTMLInputElement>(`[data-field="provider-key-${providerId}"]`)?.focus();
      return;
    }
    if (providerId === "openrouter" && !key.startsWith("sk-or-")) {
      onStatus({ message: t("api.prefixError"), error: true });
      document.querySelector<HTMLInputElement>(`[data-field="provider-key-${providerId}"]`)?.focus();
      return;
    }
    setPending(providerId);
    try {
      setSummaries(await saveProviderCredential(providerId, key));
      setDrafts((current) => ({ ...current, [providerId]: "" }));
      onStatus({ message: t("api.saved", { provider: providerLabel(providerId, locale) }), error: false });
    } catch (error) {
      onStatus({ message: credentialErrorMessage(locale, error, "api.saveFailed"), error: true });
    } finally {
      setPending(null);
    }
  };

  const clearKey = async (providerId: ProviderId) => {
    setPending(providerId);
    try {
      setSummaries(await clearProviderCredential(providerId));
      setDrafts((current) => ({ ...current, [providerId]: "" }));
      onStatus({ message: t("api.cleared", { provider: providerLabel(providerId, locale) }), error: false });
    } catch (error) {
      onStatus({ message: credentialErrorMessage(locale, error, "api.clearFailed"), error: true });
    } finally {
      setPending(null);
    }
  };

  const checkHealth = async (providerId: ProviderId) => {
    setHealthPending(providerId);
    try {
      const result = await checkProviderCredential(providerId);
      const provider = providerLabel(providerId, locale);
      if (result.healthy) {
        onStatus({ message: t("api.healthPassed", { provider, latency: result.latencyMs }), error: false });
      } else {
        const reason = t(`api.healthError.${result.errorCode ?? "provider"}` as MessageKey);
        onStatus({ message: t("api.healthFailed", { provider, reason }), error: true });
      }
    } catch (error) {
      onStatus({ message: credentialErrorMessage(locale, error, "api.healthRequestFailed"), error: true });
    } finally {
      setHealthPending(null);
    }
  };

  const isWide = useMediaQuery("(min-width: 1280px)");
  const providers = (
    <RadioList
      label={t("api.chooseProvider")}
      value={activeProviderId}
      onChange={(value) => void onProviderChange(value as ProviderId)}
      htmlName="active-provider"
      isDisabled={credentialsBusy}
    >
      {PROVIDER_IDS.map((id) => {
        const configured = summaries.find((summary) => summary.id === id)?.configured ?? false;
        return (
          <RadioListItem
            key={id}
            value={id}
            label={providerLabel(id, locale)}
            description={
              <VStack gap={1}>
                <Status
                  variant={configured ? "neutral" : "warning"}
                  label={t(configured ? "api.configured" : "api.needsKey")}
                />
              </VStack>
            }
          />
        );
      })}
    </RadioList>
  );
  const detail = (
    <VStack gap={5}>
      <HStack hAlign="between" gap={3} wrap="wrap">
        <SectionIntro
          id={`provider-detail-title-${activeProviderId}`}
          title={providerLabel(activeProviderId, locale)}
        />
        <Status
          variant={activeSummary?.configured ? "neutral" : "warning"}
          label={
            activeSummary?.configured
              ? t("api.configuredHint", { hint: activeSummary.keyHint })
              : t("api.notConfigured")
          }
        />
      </HStack>
      <Divider />
      <LabeledValue label={t("api.model")}>{activeProvider.modelId}</LabeledValue>
      <Text as="p" color="secondary">
        {t("api.privacyNotice")}{" "}
        <Link href={privacyPolicyUrl(locale)} target="_blank" hasUnderline>
          {t("privacy.policyLink")}
        </Link>
      </Text>
      <VStack
        as="form"
        gap={4}
        onSubmit={(event) => {
          event.preventDefault();
          void saveKey(activeProviderId);
        }}
      >
        <FormLayout>
          <HStack gap={2} vAlign="end">
            <StackItem size="fill">
              <TextInput
                data-field={`provider-key-${activeProviderId}`}
                label="API Key"
                type={revealed[activeProviderId] ? "text" : "password"}
                autoComplete="off"
                labelTooltip={t("api.localOnly")}
                placeholder={
                  activeSummary?.configured ? t("api.replacePlaceholder", { hint: activeSummary.keyHint }) : placeholder
                }
                value={drafts[activeProviderId]}
                isDisabled={credentialsBusy}
                onChange={(value) => setDrafts((current) => ({ ...current, [activeProviderId]: value.slice(0, 512) }))}
              />
            </StackItem>
            <IconButton
              label={t("api.toggleKey", {
                action: t(revealed[activeProviderId] ? "common.hide" : "common.show"),
                provider: providerLabel(activeProviderId, locale),
              })}
              tooltip={t(revealed[activeProviderId] ? "common.hide" : "common.show")}
              icon={<Icon icon={revealed[activeProviderId] ? EyeOff : Eye} size="sm" />}
              aria-pressed={revealed[activeProviderId]}
              variant="ghost"
              isDisabled={credentialsBusy}
              onClick={() => setRevealed((current) => ({ ...current, [activeProviderId]: !current[activeProviderId] }))}
            />
          </HStack>
        </FormLayout>
        <HStack hAlign="between" wrap="wrap" gap={3}>
          <Link href={activeProvider.keyUrl} isExternalLink>
            {t("api.getKey")}
          </Link>
          <Actions>
            <Button
              label={t("api.healthCheck")}
              isLoading={healthPending === activeProviderId}
              isDisabled={credentialsBusy || !activeSummary?.configured}
              onClick={() => void checkHealth(activeProviderId)}
            />
            {activeSummary?.configured && (
              <Button
                label={t("api.clearLocal")}
                isDisabled={credentialsBusy}
                onClick={() => void clearKey(activeProviderId)}
              />
            )}
            <Button
              type="submit"
              variant="primary"
              label={t(activeSummary?.configured ? "api.replace" : "api.save")}
              isLoading={isPending}
              isDisabled={credentialsBusy || !drafts[activeProviderId].trim()}
            />
          </Actions>
        </HStack>
      </VStack>
    </VStack>
  );
  // A fixed provider region on desktop; a stacked radio group on narrower screens.
  return isWide ? (
    <HStack gap={6} vAlign="start">
      <VStack width={280} className="shrink-0">
        {providers}
      </VStack>
      <StackItem size="fill">{detail}</StackItem>
    </HStack>
  ) : (
    <VStack gap={6}>
      {providers}
      <Divider />
      {detail}
    </VStack>
  );
}
