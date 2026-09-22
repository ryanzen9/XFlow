import type { FormEvent } from "react";
import { PROVIDERS, type AppSettings } from "../../shared";
import { Toggle } from "./Toggle";
import { ActivityPanel } from "./ActivityPanel";
import {
  card,
  control,
  field,
  fieldHelp,
  fieldLabel,
  primaryButton,
  sectionDescription,
  sectionHeading,
  sectionIcon,
  sectionTitle,
  tag,
} from "../../ui/styles";

interface Props {
  settings: AppSettings;
  busy: boolean;
  onChange: (patch: Partial<AppSettings>) => void;
  onToggle: (key: "enabled" | "commentsEnabled", checked: boolean) => void;
  onSave: () => void;
}

export function GeneralPanel({ settings, busy, onChange, onToggle, onSave }: Props) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave();
  };
  return (
    <div className="grid max-w-[980px] content-start gap-[22px]">
      <ActivityPanel />
      <section className={card}>
        <div className={sectionTitle}>
          <span className={sectionIcon} aria-hidden="true">
            ◎
          </span>
          <div>
            <h2 className={sectionHeading}>过滤范围</h2>
            <p className={sectionDescription}>决定在哪里开启安静的阅读体验。</p>
          </div>
          <span className={`${tag} ml-auto max-[600px]:hidden`}>实时生效</span>
        </div>
        <Toggle
          label="Home 时间线"
          description="识别首页中的推广与干扰内容。"
          checked={settings.enabled}
          disabled={busy}
          onChange={(checked) => onToggle("enabled", checked)}
        />
        <Toggle
          label="评论区"
          description="处理详情页中的评论，保留当前根博文。"
          checked={settings.commentsEnabled}
          disabled={busy}
          onChange={(checked) => onToggle("commentsEnabled", checked)}
        />
        <p className="pt-4 text-xs text-muted">暂停时，遮罩会平滑退出。重新启用后，命中的内容会重新进入遮蔽状态。</p>
      </section>
      <form onSubmit={submit}>
        <fieldset disabled={busy} className={card}>
          <div className={sectionTitle}>
            <span className={sectionIcon} aria-hidden="true">
              ↗
            </span>
            <div>
              <h2 className={sectionHeading}>模型显示</h2>
              <p className={sectionDescription}>为 Hover 信息设置熟悉的模型昵称。</p>
            </div>
          </div>
          <label className={field} htmlFor="model-nickname">
            <span className={fieldLabel}>模型昵称</span>
            <input
              className={control}
              id="model-nickname"
              required
              maxLength={40}
              value={settings.modelNickname}
              onChange={(event) => onChange({ modelNickname: event.target.value })}
            />
            <small className={fieldHelp}>在 Hover 信息中以 {"{{model.nickname}}"} 引用，不改变实际调用模型。</small>
          </label>
          <div className="mt-[18px] flex flex-wrap items-center gap-3 border-t border-line py-3.5 text-xs text-muted">
            <span>当前模型</span>
            <code className="font-mono text-ink">{PROVIDERS[settings.activeProvider].modelId}</code>
            <span>{PROVIDERS[settings.activeProvider].label}</span>
            <span className={tag}>Jev decision</span>
          </div>
          <div className="mt-2 flex justify-end">
            <button className={primaryButton} type="submit">
              {busy ? "保存中…" : "保存通用设置"}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
