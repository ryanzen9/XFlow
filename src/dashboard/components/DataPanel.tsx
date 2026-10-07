import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  applyEditedConfiguration,
  readConfigurationDocument,
  readS3SyncSettings,
  requestS3HostPermission,
  saveS3SyncSettings,
  synchronizeWithS3,
  validateS3Settings,
  type AppSettings,
  type S3SyncSettings,
} from "../../shared";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Grid } from "@astryxdesign/core/Grid";
import { Link } from "@astryxdesign/core/Link";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { Actions, Panel, StatusMessage, Status } from "./DashboardUI";
import { localizeError, useI18n } from "../../ui/i18n";
import { privacyPolicyUrl } from "../../ui/privacy";

type PanelStatus = { message: string; error: boolean };

function pretty(config: AppSettings): string {
  return JSON.stringify(config, null, 2);
}

export function DataPanel({ onConfigurationApplied }: { onConfigurationApplied?: () => void | Promise<void> }) {
  const { locale, t } = useI18n();
  const localeRef = useRef(locale);
  const tRef = useRef(t);
  const [config, setConfig] = useState<AppSettings | null>(null);
  const [source, setSource] = useState("");
  const [s3, setS3] = useState<S3SyncSettings | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<PanelStatus>({ message: "", error: false });

  useEffect(() => {
    localeRef.current = locale;
    tRef.current = t;
  }, [locale, t]);

  const showConfig = useCallback((next: AppSettings) => {
    setConfig(next);
    setSource(pretty(next));
  }, []);

  const load = useCallback(
    async (checkRemote = false) => {
      const [document, nextS3] = await Promise.all([readConfigurationDocument(), readS3SyncSettings()]);
      setS3(nextS3);
      showConfig(document.config);
      if (!checkRemote || !nextS3.autoSyncEnabled || validateS3Settings(nextS3)) return;
      try {
        const result = await synchronizeWithS3(nextS3, { allowPermissionRequest: false });
        showConfig(result.document.config);
        if (result.direction === "pulled") await onConfigurationApplied?.();
      } catch (error) {
        setStatus({
          message: localizeError(localeRef.current, error, "data.autoUnavailable"),
          error: true,
        });
      }
    },
    [onConfigurationApplied, showConfig],
  );

  useEffect(() => {
    void load(true).catch(() => setStatus({ message: tRef.current("data.storageReadError"), error: true }));
  }, [load]);

  const formatJson = () => {
    try {
      setSource(JSON.stringify(JSON.parse(source), null, 2));
      setStatus({ message: t("data.jsonValid"), error: false });
    } catch {
      setStatus({ message: t("data.jsonSyntax"), error: true });
    }
  };

  const applyJson = async () => {
    setBusy(true);
    try {
      const next = await applyEditedConfiguration(JSON.parse(source));
      await onConfigurationApplied?.();
      showConfig(next.config);
      setStatus({ message: t("data.applied"), error: false });
    } catch (error) {
      setStatus({ message: localizeError(locale, error, "data.applyFailed"), error: true });
    } finally {
      setBusy(false);
    }
  };

  const updateS3 = (patch: Partial<S3SyncSettings>) =>
    setS3((current) => (current ? { ...current, ...patch } : current));

  const saveAndEnableSync = async (event: FormEvent) => {
    event.preventDefault();
    if (!s3) return;
    const validationError = validateS3Settings(s3);
    if (validationError) {
      setStatus({ message: localizeError(locale, validationError, "data.syncStartFailed"), error: true });
      return;
    }
    setBusy(true);
    try {
      // Permission requests must stay directly attached to this user gesture.
      await requestS3HostPermission(s3);
      const saved = await saveS3SyncSettings({ ...s3, autoSyncEnabled: true });
      const result = await synchronizeWithS3(saved, { allowPermissionRequest: false });
      setS3(saved);
      showConfig(result.document.config);
      if (result.direction === "pulled") await onConfigurationApplied?.();
      setStatus({ message: t("data.syncStarted"), error: false });
    } catch (error) {
      setStatus({ message: localizeError(locale, error, "data.syncStartFailed"), error: true });
    } finally {
      setBusy(false);
    }
  };

  const disableSync = async () => {
    if (!s3) return;
    setBusy(true);
    try {
      const saved = await saveS3SyncSettings({ ...s3, autoSyncEnabled: false });
      setS3(saved);
      setStatus({ message: t("data.syncStopped"), error: false });
    } catch {
      setStatus({ message: t("data.s3SaveFailed"), error: true });
    } finally {
      setBusy(false);
    }
  };

  if (!config || !s3)
    return (
      <VStack gap={4}>
        <Spinner label={t("data.loading")} />
        <StatusMessage {...status} />
      </VStack>
    );

  return (
    <VStack gap={6}>
      <Grid columns={{ minWidth: 320, max: 2 }} gap={8} align="start">
        <Panel title={t("data.configTitle")} description={t("data.configDescription")} id="config-title">
          <TextArea
            data-field="config-json"
            label="Config"
            description={t("data.characters", { count: source.length })}
            rows={22}
            className="font-mono"
            hasSpellCheck={false}
            value={source}
            isDisabled={busy}
            onChange={(value) => {
              setSource(value);
              setStatus({ message: "", error: false });
            }}
          />
          <Banner status="warning" title={t("data.note")} description={t("data.keySeparated")} container="section" />
          <Actions>
            <Button label={t("data.format")} onClick={formatJson} isDisabled={busy} />
            <Button label={t("data.discard")} onClick={() => void load()} isDisabled={busy} />
            <Button variant="primary" label={t("data.apply")} isLoading={busy} onClick={() => void applyJson()} />
          </Actions>
        </Panel>
        <VStack as="form" gap={4} onSubmit={(event) => void saveAndEnableSync(event)}>
          <Panel title={t("data.s3Title")} description={t("data.s3Description")} id="s3-title">
            <Text as="p" color="secondary">
              {t("data.privacyNotice")}{" "}
              <Link href={privacyPolicyUrl(locale)} target="_blank" hasUnderline>
                {t("privacy.policyLink")}
              </Link>
            </Text>
            <Status
              variant={s3.autoSyncEnabled ? "success" : "neutral"}
              label={t(s3.autoSyncEnabled ? "data.syncEnabled" : "data.syncDisabled")}
            />
            <Text as="p" color="secondary">
              {t(s3.autoSyncEnabled ? "data.syncEnabledHelp" : "data.syncDisabledHelp")}
            </Text>
            <FormLayout>
              <TextInput
                data-field="s3-endpoint"
                label="Endpoint"
                placeholder="https://s3.us-east-1.amazonaws.com"
                value={s3.endpoint}
                isDisabled={busy}
                onChange={(endpoint) => updateS3({ endpoint })}
              />
              <TextInput
                data-field="s3-region"
                label="Region"
                value={s3.region}
                isDisabled={busy}
                onChange={(region) => updateS3({ region })}
              />
              <TextInput
                data-field="s3-bucket"
                label="Bucket"
                value={s3.bucket}
                isDisabled={busy}
                onChange={(bucket) => updateS3({ bucket })}
              />
              <TextInput
                data-field="s3-object-key"
                label="Object Key"
                value={s3.objectKey}
                isDisabled={busy}
                onChange={(objectKey) => updateS3({ objectKey })}
              />
              <TextInput
                data-field="s3-access-key"
                label="Access Key ID"
                autoComplete="off"
                value={s3.accessKeyId}
                isDisabled={busy}
                onChange={(accessKeyId) => updateS3({ accessKeyId })}
              />
              <TextInput
                data-field="s3-secret-key"
                label="Secret Access Key"
                type={showSecret ? "text" : "password"}
                autoComplete="off"
                value={s3.secretAccessKey}
                isDisabled={busy}
                onChange={(secretAccessKey) => updateS3({ secretAccessKey })}
              />
              <Button
                variant="ghost"
                size="sm"
                label={`${t(showSecret ? "common.hide" : "common.show")} Secret Access Key`}
                aria-pressed={showSecret}
                isDisabled={busy}
                onClick={() => setShowSecret((value) => !value)}
              />
              <TextArea
                data-field="s3-session-token"
                label="Session Token"
                isOptional
                rows={2}
                value={s3.sessionToken}
                isDisabled={busy}
                onChange={(sessionToken) => updateS3({ sessionToken })}
              />
            </FormLayout>
            <Divider />
            <Text as="p" color="secondary">
              {t("data.bucketHelp")}
            </Text>
            <Actions>
              {s3.autoSyncEnabled && (
                <Button label={t("data.disableSync")} isDisabled={busy} onClick={() => void disableSync()} />
              )}
              <Button
                type="submit"
                variant="primary"
                label={t(s3.autoSyncEnabled ? "data.saveSync" : "data.enableSync")}
                isLoading={busy}
              />
            </Actions>
          </Panel>
        </VStack>
      </Grid>
      <StatusMessage {...status} />
    </VStack>
  );
}
