import { useEffect, useState } from "react";
import { PROVIDERS, PROVIDER_IDS, type AppSettings, type ProviderId, type ProviderSummary } from "../../shared";
import { cn } from "../../ui/cn";
import { control, field, fieldHelp, fieldLabel, primaryButton, secondaryButton, tag } from "../../ui/styles";
import {
  clearProviderCredential,
  loadProviderSummaries,
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

export function ApiKeysPanel({ settings, busy, onProviderChange, onStatus }: Props) {
  const [summaries, setSummaries] = useState<ProviderSummary[]>([]);
  const [drafts, setDrafts] = useState(emptyDrafts);
  const [revealed, setRevealed] = useState<Record<ProviderId, boolean>>({
    openrouter: false,
    "vercel-ai-gateway": false,
    typesafe: false,
  });
  const [pending, setPending] = useState<ProviderId | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const next = await loadProviderSummaries();
        if (live) setSummaries(next);
      } catch (error) {
        if (live) {
          onStatus({ message: error instanceof Error ? error.message : "无法读取 API Key 状态。", error: true });
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [onStatus]);

  const saveKey = async (providerId: ProviderId) => {
    const key = drafts[providerId].trim();
    if (!key) {
      onStatus({ message: `请输入 ${PROVIDERS[providerId].label} API Key。`, error: true });
      document.getElementById(`provider-key-${providerId}`)?.focus();
      return;
    }
    if (providerId === "openrouter" && !key.startsWith("sk-or-")) {
      onStatus({ message: "OpenRouter API Key 应以 sk-or- 开头。", error: true });
      document.getElementById(`provider-key-${providerId}`)?.focus();
      return;
    }
    setPending(providerId);
    try {
      setSummaries(await saveProviderCredential(providerId, key));
      setDrafts((current) => ({ ...current, [providerId]: "" }));
      onStatus({ message: `${PROVIDERS[providerId].label} API Key 已安全保存到本机。`, error: false });
    } catch (error) {
      onStatus({ message: error instanceof Error ? error.message : "API Key 保存失败。", error: true });
    } finally {
      setPending(null);
    }
  };

  const clearKey = async (providerId: ProviderId) => {
    setPending(providerId);
    try {
      setSummaries(await clearProviderCredential(providerId));
      setDrafts((current) => ({ ...current, [providerId]: "" }));
      onStatus({ message: `${PROVIDERS[providerId].label} API Key 已从本机清除。`, error: false });
    } catch (error) {
      onStatus({ message: error instanceof Error ? error.message : "API Key 清除失败。", error: true });
    } finally {
      setPending(null);
    }
  };

  const activeProviderId = settings.activeProvider;
  const activeProvider = PROVIDERS[activeProviderId];
  const activeSummary = summaries.find((summary) => summary.id === activeProviderId);
  const isPending = pending === activeProviderId;
  const credentialsBusy = busy || pending !== null;
  const helpId = `provider-key-help-${activeProviderId}`;

  return (
    <div className="grid max-w-(--layout-content-max) overflow-hidden rounded-lg border border-line bg-surface lg:grid-cols-[minmax(220px,.72fr)_minmax(0,2fr)]">
      <fieldset
        className="min-w-0 border-0 border-b border-line p-0 lg:border-r lg:border-b-0"
        disabled={credentialsBusy}
      >
        <legend className="sr-only">选择 Jev API 渠道</legend>
        <div className="border-b border-line px-5 py-[18px]">
          <p className="text-label text-ink">调用渠道</p>
          <p className="mt-1 text-xs text-muted">一次仅使用一个渠道</p>
        </div>
        <div className="grid divide-y divide-line">
          {PROVIDER_IDS.map((providerId) => {
            const provider = PROVIDERS[providerId];
            const configured = summaries.find((summary) => summary.id === providerId)?.configured ?? false;
            const selected = activeProviderId === providerId;
            return (
              <label
                htmlFor={`active-provider-${providerId}`}
                aria-label={`${provider.label}，${configured ? "已配置密钥" : "需要 API Key"}`}
                className={cn(
                  "relative flex min-h-24 cursor-pointer items-center gap-3.5 px-5 py-4 text-muted transition-colors before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-transparent before:content-[''] hover:bg-hover hover:text-ink has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55 has-[:focus-visible]:outline-(length:--focus-ring-width) has-[:focus-visible]:outline-offset-(--focus-ring-offset) has-[:focus-visible]:outline-focus",
                  selected && "bg-selected text-ink before:bg-ink",
                )}
                key={providerId}
                data-state={selected ? "selected" : "idle"}
              >
                <input
                  className="peer sr-only"
                  id={`active-provider-${providerId}`}
                  type="radio"
                  name="active-provider"
                  value={providerId}
                  checked={selected}
                  onChange={() => void onProviderChange(providerId)}
                />
                <span
                  className="grid size-4 shrink-0 place-items-center rounded-full border border-line-strong bg-surface peer-checked:border-action peer-checked:bg-action after:size-1.5 after:rounded-full after:bg-transparent after:content-[''] peer-checked:after:bg-action-fg"
                  aria-hidden="true"
                />
                <span className="grid min-w-0 flex-1 gap-1">
                  <strong className="truncate text-xs text-ink">{provider.label}</strong>
                  <small className="truncate font-mono text-caption text-muted">{provider.modelId}</small>
                  <small className={cn("mt-1 text-caption", configured ? "text-muted" : "text-warn")}>
                    {configured ? "已配置密钥" : "需要 API Key"}
                  </small>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <section className="min-w-0 p-[18px] sm:p-6 lg:p-8" aria-labelledby={`provider-detail-title-${activeProviderId}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-meta text-muted">PROVIDER / ACTIVE</p>
            <h2 className="mt-2 text-heading text-ink" id={`provider-detail-title-${activeProviderId}`}>
              {activeProvider.label}
            </h2>
            <p className="mt-1.5 max-w-(--layout-measure-narrow) text-xs text-muted">
              配置该渠道访问 Jev 所需的本地凭据。切换左侧渠道后，此处会显示对应配置。
            </p>
          </div>
          <span className={cn(tag, activeSummary?.configured && "border border-line-strong bg-selected")}>
            {activeSummary?.configured ? `已配置 ${activeSummary.keyHint}` : "未配置"}
          </span>
        </div>

        <dl className="mt-7 grid border-y border-line sm:grid-cols-2 sm:divide-x sm:divide-line">
          <div className="py-4 sm:pr-5">
            <dt className="text-meta text-muted">调用模型</dt>
            <dd className="mt-1.5 truncate font-mono text-xs text-ink" title={activeProvider.modelId}>
              {activeProvider.modelId}
            </dd>
          </div>
          <div className="border-t border-line py-4 sm:border-t-0 sm:pl-5">
            <dt className="text-meta text-muted">凭据状态</dt>
            <dd className="mt-1.5 flex items-center gap-2 text-xs text-ink">
              <span
                className={cn("size-1.5 rounded-full bg-warn", activeSummary?.configured && "bg-live")}
                aria-hidden="true"
              />
              {activeSummary?.configured ? `已保存在本机 · ${activeSummary.keyHint}` : "等待配置 API Key"}
            </dd>
          </div>
        </dl>

        <form
          className="mt-7"
          onSubmit={(event) => {
            event.preventDefault();
            void saveKey(activeProviderId);
          }}
        >
          <label className={`${field} mt-0`} htmlFor={`provider-key-${activeProviderId}`}>
            <span className={fieldLabel}>
              API Key
              <a
                className="text-xs text-ink underline decoration-fg-4 underline-offset-[3px] transition-[text-decoration-color] hover:decoration-fg-2"
                href={activeProvider.keyUrl}
                target="_blank"
                rel="noreferrer"
              >
                获取 API Key ↗
              </a>
            </span>
            <span className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                className={`${control} font-mono`}
                id={`provider-key-${activeProviderId}`}
                type={revealed[activeProviderId] ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                maxLength={512}
                placeholder={
                  activeSummary?.configured
                    ? `已保存 ${activeSummary.keyHint}；输入新 Key 可替换`
                    : activeProvider.keyPlaceholder
                }
                value={drafts[activeProviderId]}
                disabled={credentialsBusy}
                aria-describedby={helpId}
                onChange={(event) => setDrafts((current) => ({ ...current, [activeProviderId]: event.target.value }))}
              />
              <button
                className={secondaryButton}
                type="button"
                disabled={credentialsBusy}
                aria-label={`${revealed[activeProviderId] ? "隐藏" : "显示"}${activeProvider.label} API Key`}
                aria-pressed={revealed[activeProviderId]}
                onClick={() =>
                  setRevealed((current) => ({ ...current, [activeProviderId]: !current[activeProviderId] }))
                }
              >
                {revealed[activeProviderId] ? "隐藏" : "显示"}
              </button>
            </span>
            <small className={fieldHelp} id={helpId}>
              密钥只保存在浏览器本地，不进入配置 JSON 或 S3 同步。
            </small>
          </label>
          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:flex-wrap sm:justify-end">
            {activeSummary?.configured && (
              <button
                className={secondaryButton}
                type="button"
                disabled={credentialsBusy}
                onClick={() => void clearKey(activeProviderId)}
              >
                清除本机密钥
              </button>
            )}
            <button
              className={primaryButton}
              type="submit"
              disabled={credentialsBusy || !drafts[activeProviderId].trim()}
            >
              {isPending ? "保存中…" : activeSummary?.configured ? "替换 API Key" : "保存 API Key"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
