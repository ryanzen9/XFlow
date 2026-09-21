import type { FormEvent } from "react";
import { PROVIDERS, type AppSettings } from "../../shared";
import { Toggle } from "./Toggle";
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
    <div className="grid gap-6 min-[961px]:grid-cols-[minmax(0,730px)_minmax(180px,1fr)] min-[1151px]:gap-10">
      <div className="grid content-start gap-[22px]">
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
          <p className="pt-4 text-[11px] text-muted">
            暂停时，遮罩会平滑退出。重新启用后，命中的内容会重新进入遮蔽状态。
          </p>
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
            <div className="mt-[18px] flex flex-wrap items-center gap-3 border-t border-line py-3.5 text-[11px] text-muted">
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
      <aside className="hidden py-8 min-[961px]:block">
        <span className="font-mono text-[10px] font-semibold tracking-[0.12em] text-signal">YOUR READING SPACE</span>
        <h2 className="mt-5 text-[clamp(22px,2.3vw,32px)] leading-[1.7] font-medium tracking-[-0.05em]">
          让注意力，
          <br />
          回到内容本身。
        </h2>
        <div
          className="mt-8 grid size-[130px] place-items-center rounded-full border border-dashed border-line-strong shadow-[inset_0_0_0_18px_var(--color-canvas),inset_0_0_0_19px_var(--color-line)]"
          aria-hidden="true"
        >
          <span className="grid size-[60px] place-items-center rounded-full bg-soft font-mono text-[19px] text-signal">
            XF
          </span>
        </div>
        <p className="mt-3.5 text-xs leading-[1.9] text-muted">
          内容留在原位。
          <br />
          柔和遮蔽，自由揭示。
        </p>
        <div className="my-[22px] h-px bg-line min-[1151px]:mt-[34px]" />
        <h3 className="text-[13px] font-semibold">两个场景，各自排序</h3>
        <p className="mt-3.5 text-xs leading-[1.9] text-muted">
          时间线与评论区各有独立策略表，分别从 P1 起选择第一条达到阈值的策略。
        </p>
      </aside>
    </div>
  );
}
