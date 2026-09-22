import { useCallback, useEffect, useState, type FormEvent } from "react";
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
import { cn } from "../../ui/cn";
import { useI18n } from "../../ui/i18n";
import {
  card,
  control,
  field,
  fieldHelp,
  fieldLabel,
  primaryButton,
  secondaryButton,
  sectionDescription,
  sectionHeading,
  sectionIcon,
  sectionTitle,
  textButton,
  textarea,
} from "../../ui/styles";

type PanelStatus = { message: string; error: boolean };

function pretty(config: AppSettings): string {
  return JSON.stringify(config, null, 2);
}

export function DataPanel({ onConfigurationApplied }: { onConfigurationApplied?: () => void | Promise<void> }) {
  const { t } = useI18n();
  const [config, setConfig] = useState<AppSettings | null>(null);
  const [source, setSource] = useState("");
  const [s3, setS3] = useState<S3SyncSettings | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<PanelStatus>({ message: "", error: false });

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
          message: error instanceof Error ? `${t("data.autoUnavailable")} ${error.message}` : t("data.autoUnavailable"),
          error: true,
        });
      }
    },
    [onConfigurationApplied, showConfig, t],
  );

  useEffect(() => {
    void load(true).catch(() => setStatus({ message: t("data.storageReadError"), error: true }));
  }, [load, t]);

  const formatJson = () => {
    try {
      setSource(JSON.stringify(JSON.parse(source), null, 2));
      setStatus({ message: t("data.jsonValid"), error: false });
    } catch (error) {
      setStatus({
        message: error instanceof Error ? `${t("data.jsonSyntax")} ${error.message}` : t("data.jsonSyntax"),
        error: true,
      });
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
      setStatus({ message: error instanceof Error ? error.message : t("data.applyFailed"), error: true });
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
      setStatus({ message: validationError, error: true });
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
      setStatus({ message: error instanceof Error ? error.message : t("data.syncStartFailed"), error: true });
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
      <div className={card} role="status">
        {t("data.loading")}
      </div>
    );

  return (
    <div className="grid items-start gap-6 min-[961px]:grid-cols-[minmax(0,1.2fr)_minmax(330px,.8fr)]">
      <section className="min-w-0" aria-labelledby="config-title">
        <div className={`${card} min-w-0`}>
          <div className={sectionTitle}>
            <span className={sectionIcon} aria-hidden="true">
              {"{}"}
            </span>
            <div>
              <h2 className={sectionHeading} id="config-title">
                {t("data.configTitle")}
              </h2>
              <p className={sectionDescription}>{t("data.configDescription")}</p>
            </div>
          </div>
          <label className={field} htmlFor="config-json">
            <span className={fieldLabel}>
              Config <small className={fieldHelp}>{t("data.characters", { count: source.length })}</small>
            </span>
            <textarea
              id="config-json"
              className={`${textarea} min-h-[430px] overflow-auto bg-inset font-mono text-meta leading-[1.75] whitespace-pre text-ink caret-live sm:min-h-[520px] sm:text-xs`}
              spellCheck={false}
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                setStatus({ message: "", error: false });
              }}
              aria-describedby="config-help"
            />
          </label>
          <p
            id="config-help"
            className="mt-3.5 border-l-[3px] border-warn bg-warn-soft px-[13px] py-[11px] text-meta leading-[1.7] text-warn"
          >
            <strong>{t("data.note")}</strong>
            {t("data.keySeparated")}
          </p>
          <div className="mt-[18px] flex flex-col justify-end gap-2 min-[601px]:flex-row min-[601px]:flex-wrap">
            <button type="button" className={secondaryButton} onClick={formatJson} disabled={busy}>
              {t("data.format")}
            </button>
            <button type="button" className={secondaryButton} onClick={() => void load()} disabled={busy}>
              {t("data.discard")}
            </button>
            <button type="button" className={primaryButton} onClick={() => void applyJson()} disabled={busy}>
              {busy ? t("data.writing") : t("data.apply")}
            </button>
          </div>
        </div>
      </section>

      <aside className="min-w-0 min-[961px]:sticky min-[961px]:top-6" aria-labelledby="s3-title">
        <form className={card} onSubmit={(event) => void saveAndEnableSync(event)}>
          <div className={sectionTitle}>
            <span className={sectionIcon} aria-hidden="true">
              ⇅
            </span>
            <div>
              <h2 className={sectionHeading} id="s3-title">
                {t("data.s3Title")}
              </h2>
              <p className={sectionDescription}>{t("data.s3Description")}</p>
            </div>
          </div>
          <div
            className="my-[18px] mb-1 flex items-center gap-2.5 rounded-md border border-line bg-canvas/45 px-3 py-[11px]"
            role="status"
          >
            <span
              className={cn(
                "size-2 shrink-0 rounded-full bg-faint shadow-[0_0_0_4px_color-mix(in_srgb,var(--fg-4)_14%,transparent)]",
                s3.autoSyncEnabled && "bg-live shadow-[0_0_0_4px_var(--live-glow)]",
              )}
              aria-hidden="true"
            />
            <div className="grid gap-0.5">
              <strong className="text-xs text-ink">
                {t(s3.autoSyncEnabled ? "data.syncEnabled" : "data.syncDisabled")}
              </strong>
              <small className="text-caption leading-normal text-muted">
                {s3.autoSyncEnabled ? t("data.syncEnabledHelp") : t("data.syncDisabledHelp")}
              </small>
            </div>
          </div>
          <label className={`${field} mt-[15px]`} htmlFor="s3-endpoint">
            <span className={fieldLabel}>Endpoint</span>
            <input
              className={control}
              id="s3-endpoint"
              type="url"
              placeholder="https://s3.us-east-1.amazonaws.com"
              value={s3.endpoint}
              onChange={(event) => updateS3({ endpoint: event.target.value })}
            />
          </label>
          <div className="grid gap-0 min-[601px]:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] min-[601px]:gap-2.5">
            <label className={`${field} mt-[15px]`} htmlFor="s3-region">
              <span className={fieldLabel}>Region</span>
              <input
                className={control}
                id="s3-region"
                value={s3.region}
                onChange={(event) => updateS3({ region: event.target.value })}
              />
            </label>
            <label className={`${field} mt-[15px]`} htmlFor="s3-bucket">
              <span className={fieldLabel}>Bucket</span>
              <input
                className={control}
                id="s3-bucket"
                value={s3.bucket}
                onChange={(event) => updateS3({ bucket: event.target.value })}
              />
            </label>
          </div>
          <label className={`${field} mt-[15px]`} htmlFor="s3-object-key">
            <span className={fieldLabel}>Object Key</span>
            <input
              className={control}
              id="s3-object-key"
              value={s3.objectKey}
              onChange={(event) => updateS3({ objectKey: event.target.value })}
            />
          </label>
          <label className={`${field} mt-[15px]`} htmlFor="s3-access-key">
            <span className={fieldLabel}>Access Key ID</span>
            <input
              className={control}
              id="s3-access-key"
              autoComplete="off"
              value={s3.accessKeyId}
              onChange={(event) => updateS3({ accessKeyId: event.target.value })}
            />
          </label>
          <label className={`${field} mt-[15px]`} htmlFor="s3-secret-key">
            <span className={fieldLabel}>
              Secret Access Key{" "}
              <button
                type="button"
                className={textButton}
                aria-pressed={showSecret}
                onClick={() => setShowSecret((value) => !value)}
              >
                {t(showSecret ? "common.hide" : "common.show")}
              </button>
            </span>
            <input
              className={control}
              id="s3-secret-key"
              type={showSecret ? "text" : "password"}
              autoComplete="off"
              value={s3.secretAccessKey}
              onChange={(event) => updateS3({ secretAccessKey: event.target.value })}
            />
          </label>
          <label className={`${field} mt-[15px]`} htmlFor="s3-session-token">
            <span className={fieldLabel}>
              Session Token <small className={fieldHelp}>{t("common.optional")}</small>
            </span>
            <textarea
              className={textarea}
              id="s3-session-token"
              rows={2}
              value={s3.sessionToken}
              onChange={(event) => updateS3({ sessionToken: event.target.value })}
            />
          </label>
          <p className={`${fieldHelp} mt-4 border-t border-line pt-3.5`}>{t("data.bucketHelp")}</p>
          <div className="mt-[18px] flex flex-col justify-end gap-2 min-[601px]:flex-row min-[601px]:flex-wrap">
            {s3.autoSyncEnabled && (
              <button type="button" className={secondaryButton} disabled={busy} onClick={() => void disableSync()}>
                {t("data.disableSync")}
              </button>
            )}
            <button type="submit" className={primaryButton} disabled={busy}>
              {busy ? t("common.saving") : t(s3.autoSyncEnabled ? "data.saveSync" : "data.enableSync")}
            </button>
          </div>
        </form>
      </aside>
      {status.message && (
        <div
          className={cn(
            "col-[1/-1] min-h-[38px] rounded-lg bg-selected px-3 py-[9px] text-xs text-ink",
            status.error && "bg-danger-soft text-danger",
          )}
          role={status.error ? "alert" : "status"}
        >
          {status.message}
        </div>
      )}
    </div>
  );
}
