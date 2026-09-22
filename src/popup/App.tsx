import { cn } from "../ui/cn";
import { ThemeToggle } from "../ui/theme";
import { BrandHeader } from "./components/BrandHeader";
import { ModelFooter } from "./components/ModelFooter";
import { MonitorSwitch } from "./components/MonitorSwitch";
import { ActivitySummary } from "./components/ActivitySummary";
import { useSettingsForm } from "./hooks/use-settings-form";
import { useActivity } from "./hooks/use-activity";

export function App() {
  const form = useSettingsForm();
  const activity = useActivity();

  return (
    <main className="min-h-[500px] w-[388px] bg-canvas bg-[linear-gradient(90deg,transparent_23px,color-mix(in_srgb,var(--color-ink)_4.5%,transparent)_24px,transparent_25px),linear-gradient(180deg,color-mix(in_srgb,var(--color-panel)_55%,transparent),transparent_42%)] px-[22px] pt-3 pb-2.5 font-sans text-ink transition-colors">
      <BrandHeader>
        <ThemeToggle value={form.theme} compact onChange={(theme) => void form.setTheme(theme)} />
      </BrandHeader>

      <div className="mt-3">
        <ActivitySummary {...activity} />
      </div>

      <p className="mx-0.5 my-2.5 text-[11px] leading-[1.55] text-muted">
        为时间线与评论区附上一层安静的内容信号，快速识别推广与垃圾信息。
      </p>

      <div className="grid gap-2.5" aria-label="XFilter 设置">
        <div className="grid gap-[9px]" aria-label="过滤范围">
          <MonitorSwitch
            id="enabled"
            routeLabel="/home"
            title="时间线过滤"
            ariaLabel="启用时间线分析"
            enabledDescription="命中阈值的博文会实时进入遮蔽状态"
            disabledDescription="所有博文保持可见，已有遮挡会平滑退出"
            pendingDescription="正在同步时间线中的内容状态"
            checked={form.enabled}
            disabled={!form.settingsReady || form.enabledPending}
            pending={form.enabledPending}
            onChange={(event) => void form.setEnabled(event.currentTarget.checked)}
          />
          <MonitorSwitch
            id="comments-enabled"
            routeLabel="/status"
            title="评论区过滤"
            ariaLabel="启用评论区分析"
            enabledDescription="命中阈值的评论会使用相同的柔和遮罩"
            disabledDescription="所有评论保持可见，已有遮挡会平滑退出"
            pendingDescription="正在同步评论区中的内容状态"
            checked={form.commentsEnabled}
            disabled={!form.settingsReady || form.commentsEnabledPending}
            pending={form.commentsEnabledPending}
            onChange={(event) => void form.setCommentsEnabled(event.currentTarget.checked)}
          />
        </div>

        <section
          className="rounded-[10px] border border-line bg-panel px-3.5 py-3"
          data-state={form.configured ? "configured" : "empty"}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-semibold tracking-[0.12em] text-muted">ACTIVE PROVIDER</p>
              <strong className="mt-1 block text-xs">{form.providerName}</strong>
            </div>
            <span className={cn("text-[10px] text-alert", form.configured && "text-signal")}>
              {form.configured ? "已配置" : "需要 API Key"}
            </span>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-muted">
            密钥与渠道切换已移至 Dashboard，避免在弹窗中暴露已保存凭证。
          </p>
        </section>

        <p
          id="save-status"
          className={cn(
            "mx-0.5 min-h-4 text-[10px] leading-[1.45] text-faint",
            form.status.tone === "success" && "text-signal",
            form.status.tone === "error" && "text-alert",
          )}
          role="status"
          aria-live="polite"
        >
          {form.status.message}
        </p>
      </div>

      <ModelFooter modelId={form.modelId} />
      <button
        className="mt-2 block min-h-[30px] w-full rounded-md border-0 bg-soft text-[11px] text-signal transition hover:bg-signal/15 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
        type="button"
        onClick={() => void chrome.runtime.openOptionsPage()}
      >
        打开 Dashboard · API Keys 与策略 ↗
      </button>
    </main>
  );
}
