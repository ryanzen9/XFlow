import { useEffect, useState } from "react";
import { PROVIDERS, PROVIDER_IDS, type AppSettings, type ProviderId, type ProviderSummary } from "../../shared";
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
  tag,
} from "../../ui/styles";
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

  return (
    <div className="grid max-w-[980px] gap-6">
      <section className={card} aria-labelledby="provider-selection-title">
        <div className={sectionTitle}>
          <span className={sectionIcon} aria-hidden="true">
            ⇄
          </span>
          <div>
            <h2 className={sectionHeading} id="provider-selection-title">
              当前调用渠道
            </h2>
            <p className={sectionDescription}>一次只使用一个渠道；失败时不会携带密钥回退到其他渠道。</p>
          </div>
        </div>
        <fieldset className="grid gap-2 sm:grid-cols-3" disabled={busy || pending !== null}>
          <legend className="sr-only">选择 Jev API 渠道</legend>
          {PROVIDER_IDS.map((providerId) => {
            const provider = PROVIDERS[providerId];
            const configured = summaries.find((summary) => summary.id === providerId)?.configured ?? false;
            return (
              <label
                htmlFor={`active-provider-${providerId}`}
                className="flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3 transition hover:border-line-strong has-[:checked]:border-signal has-[:checked]:bg-soft"
                key={providerId}
                data-state={settings.activeProvider === providerId ? "selected" : "idle"}
              >
                <span className="sr-only">选择渠道：</span>
                <input
                  id={`active-provider-${providerId}`}
                  type="radio"
                  name="active-provider"
                  value={providerId}
                  checked={settings.activeProvider === providerId}
                  onChange={() => void onProviderChange(providerId)}
                />
                <span className="grid min-w-0 gap-1">
                  <strong className="text-xs">{provider.label}</strong>
                  <small className={configured ? "text-signal" : "text-muted"}>
                    {configured ? "已配置" : "需要 API Key"}
                  </small>
                </span>
              </label>
            );
          })}
        </fieldset>
      </section>

      <div className="grid gap-4">
        {PROVIDER_IDS.map((providerId) => {
          const provider = PROVIDERS[providerId];
          const summary = summaries.find((item) => item.id === providerId);
          const isPending = pending === providerId;
          return (
            <section className={card} key={providerId} data-state={summary?.configured ? "configured" : "empty"}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">{provider.label}</h2>
                  <p className="mt-1 text-xs text-muted">
                    模型 <code className="font-mono text-ink">{provider.modelId}</code>
                  </p>
                </div>
                <span className={cn(tag, summary?.configured && "border-signal/30 bg-soft text-signal")}>
                  {summary?.configured ? `已配置 ${summary.keyHint}` : "未配置"}
                </span>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveKey(providerId);
                }}
              >
                <label className={`${field} mt-5`} htmlFor={`provider-key-${providerId}`}>
                  <span className={fieldLabel}>
                    API Key{" "}
                    <a
                      className="text-[11px] text-signal hover:underline"
                      href={provider.keyUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      获取 Key ↗
                    </a>
                  </span>
                  <span className="flex gap-2">
                    <input
                      className={`${control} flex-1 font-mono`}
                      id={`provider-key-${providerId}`}
                      type={revealed[providerId] ? "text" : "password"}
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={512}
                      placeholder={
                        summary?.configured ? `已保存 ${summary.keyHint}；输入新 Key 可替换` : provider.keyPlaceholder
                      }
                      value={drafts[providerId]}
                      disabled={busy || pending !== null}
                      onChange={(event) => setDrafts((current) => ({ ...current, [providerId]: event.target.value }))}
                    />
                    <button
                      className={secondaryButton}
                      type="button"
                      disabled={busy || pending !== null}
                      aria-label={`${revealed[providerId] ? "隐藏" : "显示"}${provider.label} API Key`}
                      onClick={() => setRevealed((current) => ({ ...current, [providerId]: !current[providerId] }))}
                    >
                      {revealed[providerId] ? "隐藏" : "显示"}
                    </button>
                  </span>
                  <small className={fieldHelp}>密钥只保存在浏览器本地，不进入配置 JSON 或 S3 同步。</small>
                </label>
                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
                  {summary?.configured && (
                    <button
                      className={secondaryButton}
                      type="button"
                      disabled={busy || pending !== null}
                      onClick={() => void clearKey(providerId)}
                    >
                      清除本机密钥
                    </button>
                  )}
                  <button
                    className={primaryButton}
                    type="submit"
                    disabled={busy || pending !== null || !drafts[providerId].trim()}
                  >
                    {isPending ? "保存中…" : summary?.configured ? "替换 API Key" : "保存 API Key"}
                  </button>
                </div>
              </form>
            </section>
          );
        })}
      </div>
    </div>
  );
}
