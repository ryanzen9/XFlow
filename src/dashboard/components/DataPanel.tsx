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
          message: error instanceof Error ? `自动同步暂不可用：${error.message}` : "自动同步暂不可用。",
          error: true,
        });
      }
    },
    [onConfigurationApplied, showConfig],
  );

  useEffect(() => {
    void load(true).catch(() => setStatus({ message: "无法读取浏览器存储。", error: true }));
  }, [load]);

  const formatJson = () => {
    try {
      setSource(JSON.stringify(JSON.parse(source), null, 2));
      setStatus({ message: "JSON 格式正确，尚未写入浏览器。", error: false });
    } catch (error) {
      setStatus({
        message: error instanceof Error ? `JSON 语法错误：${error.message}` : "JSON 语法错误。",
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
      setStatus({ message: "配置已写入浏览器；如已启用云端同步，后台会自动处理。", error: false });
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : "配置写入失败。", error: true });
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
      setStatus({ message: "S3 自动同步已启用，配置比较与传输将在后台完成。", error: false });
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : "S3 自动同步启用失败。", error: true });
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
      setStatus({ message: "S3 自动同步已停用，连接配置仍保存在本机。", error: false });
    } catch {
      setStatus({ message: "S3 配置保存失败。", error: true });
    } finally {
      setBusy(false);
    }
  };

  if (!config || !s3)
    return (
      <div className={card} role="status">
        正在读取配置…
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
                配置 JSON
              </h2>
              <p className={sectionDescription}>直接编辑扩展配置。同步所需的系统字段由后台维护，不会出现在编辑区。</p>
            </div>
          </div>
          <label className={field} htmlFor="config-json">
            <span className={fieldLabel}>
              Config <small className={fieldHelp}>{source.length} characters</small>
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
            <strong>说明：</strong>API Key 与此配置分开保存在本机，不会出现在 JSON 或上传到 S3。
          </p>
          <div className="mt-[18px] flex flex-col justify-end gap-2 min-[601px]:flex-row min-[601px]:flex-wrap">
            <button type="button" className={secondaryButton} onClick={formatJson} disabled={busy}>
              格式化 JSON
            </button>
            <button type="button" className={secondaryButton} onClick={() => void load()} disabled={busy}>
              放弃修改并重载
            </button>
            <button type="button" className={primaryButton} onClick={() => void applyJson()} disabled={busy}>
              {busy ? "写入中…" : "应用到浏览器存储"}
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
                S3 配置同步
              </h2>
              <p className={sectionDescription}>首次保存后，扩展自动比较并同步配置。</p>
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
              <strong className="text-xs text-ink">{s3.autoSyncEnabled ? "自动同步已启用" : "自动同步尚未启用"}</strong>
              <small className="text-caption leading-normal text-muted">
                {s3.autoSyncEnabled
                  ? "配置变更、浏览器启动与定时检查时自动运行"
                  : "保存连接配置并授权 Endpoint 后即可启用"}
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
                {showSecret ? "隐藏" : "显示"}
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
              Session Token <small className={fieldHelp}>可选</small>
            </span>
            <textarea
              className={textarea}
              id="s3-session-token"
              rows={2}
              value={s3.sessionToken}
              onChange={(event) => updateS3({ sessionToken: event.target.value })}
            />
          </label>
          <p className={`${fieldHelp} mt-4 border-t border-line pt-3.5`}>
            Bucket 必须允许扩展来源进行 GET、PUT 和 CORS 预检。首次启用会请求该 Endpoint 的访问权限；凭据只保存在本机。
          </p>
          <div className="mt-[18px] flex flex-col justify-end gap-2 min-[601px]:flex-row min-[601px]:flex-wrap">
            {s3.autoSyncEnabled && (
              <button type="button" className={secondaryButton} disabled={busy} onClick={() => void disableSync()}>
                停用自动同步
              </button>
            )}
            <button type="submit" className={primaryButton} disabled={busy}>
              {busy ? "保存中…" : s3.autoSyncEnabled ? "保存自动同步配置" : "保存并启用自动同步"}
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
