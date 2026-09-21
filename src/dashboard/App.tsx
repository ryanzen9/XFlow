import { useEffect, useState } from "react";
import {
  compileHoverCss,
  createStrategy,
  reindexStrategies,
  validateTemplate,
  PROVIDERS,
  type FilterStrategy,
  type FilterSurface,
} from "../shared";
import { GeneralPanel } from "./components/GeneralPanel";
import { ApiKeysPanel } from "./components/ApiKeysPanel";
import { DataPanel } from "./components/DataPanel";
import { StrategyList } from "./components/StrategyList";
import { StrategyPanel } from "./components/StrategyPanel";
import { StrategyTabs } from "./components/StrategyTabs";
import { useDashboard } from "./hooks/use-dashboard";
import { ThemeToggle, applyTheme } from "../ui/theme";
import { cn } from "../ui/cn";
import { card, eyebrow, textButton } from "../ui/styles";

function strategyError(strategy: FilterStrategy): string | null {
  if (!strategy.name.trim() || !strategy.prompt.trim() || !strategy.hoverTemplate.trim()) {
    return "请填写策略名称、提示词和 Hover 文案。";
  }
  if (strategy.surfaces.length === 0) return "请至少选择一个应用范围。";
  return compileHoverCss(strategy.hoverCss, "#validation").error || validateTemplate(strategy.hoverTemplate);
}

export function App() {
  const [menu, setMenu] = useState<"general" | "api-keys" | "strategies" | "data">("general");
  const [strategySurface, setStrategySurface] = useState<FilterSurface>("timeline");
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const form = useDashboard();
  const { draft, saved } = form;
  const theme = draft?.theme;
  useEffect(() => {
    if (theme) applyTheme(theme);
  }, [theme]);
  const selectedStrategy = draft?.strategies.find((strategy) => strategy.id === selectedStrategyId) ?? null;
  const libraryDirty = JSON.stringify(draft?.strategies) !== JSON.stringify(saved?.strategies);
  const surfaceStrategies = draft?.strategies.filter((strategy) => strategy.surfaces[0] === strategySurface) ?? [];
  const strategyCounts: Record<FilterSurface, number> = {
    timeline: draft?.strategies.filter((strategy) => strategy.surfaces[0] === "timeline").length ?? 0,
    comments: draft?.strategies.filter((strategy) => strategy.surfaces[0] === "comments").length ?? 0,
  };

  const setMenuPage = (nextMenu: "general" | "api-keys" | "strategies" | "data") => {
    setMenu(nextMenu);
    if (nextMenu === "strategies") setSelectedStrategyId(null);
  };

  const saveGeneral = () => {
    if (!draft) return;
    const modelNickname = draft.modelNickname.trim();
    if (!modelNickname) {
      form.setStatus({ message: "请填写模型昵称。", error: true });
      document.getElementById("model-nickname")?.focus();
      return;
    }
    void form.save({ modelNickname });
  };

  const updateStrategies = (strategies: FilterStrategy[]) => {
    form.update({ strategies: reindexStrategies(strategies) });
  };

  const updateSurfaceStrategies = (strategies: FilterStrategy[]) => {
    if (!draft) return;
    const timeline =
      strategySurface === "timeline"
        ? strategies
        : draft.strategies.filter((strategy) => strategy.surfaces[0] === "timeline");
    const comments =
      strategySurface === "comments"
        ? strategies
        : draft.strategies.filter((strategy) => strategy.surfaces[0] === "comments");
    updateStrategies([...timeline, ...comments]);
  };

  const saveLibrary = () => {
    if (!draft) return;
    const invalid = draft.strategies.find((strategy) => strategyError(strategy));
    if (invalid) {
      form.setStatus({ message: `${invalid.name}：${strategyError(invalid)}`, error: true });
      return;
    }
    void form.save(
      { strategies: reindexStrategies(draft.strategies) },
      "策略顺序与启用状态已保存，当前页面将按新优先级重新判断。",
    );
  };

  const createNewStrategy = () => {
    if (!draft) return;
    const strategy = createStrategy(strategySurface, surfaceStrategies.length + 1);
    updateSurfaceStrategies([...surfaceStrategies, strategy]);
    setSelectedStrategyId(strategy.id);
  };

  const updateSelectedStrategy = (strategy: FilterStrategy) => {
    if (!draft) return;
    updateStrategies(draft.strategies.map((item) => (item.id === strategy.id ? strategy : item)));
  };

  const changeSelectedPriority = (priority: number) => {
    if (!draft || !selectedStrategy) return;
    const remaining = surfaceStrategies.filter((strategy) => strategy.id !== selectedStrategy.id);
    remaining.splice(Math.max(0, Math.min(priority - 1, remaining.length)), 0, selectedStrategy);
    updateSurfaceStrategies(remaining);
  };

  const saveSelectedStrategy = () => {
    if (!draft || !selectedStrategy) return;
    const error = strategyError(selectedStrategy);
    if (error) {
      form.setStatus({ message: error, error: true });
      return;
    }
    const strategies = reindexStrategies(
      draft.strategies.map((strategy) =>
        strategy.id === selectedStrategy.id
          ? { ...selectedStrategy, name: selectedStrategy.name.trim(), prompt: selectedStrategy.prompt.trim() }
          : strategy,
      ),
    );
    void form.save({ strategies }, `策略「${selectedStrategy.name.trim()}」已保存，适用页面将按优先级重新判断。`);
  };

  const pageTitle =
    menu === "general"
      ? "通用设置"
      : menu === "api-keys"
        ? "API Keys"
        : menu === "data"
          ? "数据与同步"
          : selectedStrategy
            ? "编辑策略"
            : "策略管理";
  const pageDescription =
    menu === "general"
      ? "选择过滤范围，并设置 Hover 中显示的模型昵称。"
      : menu === "api-keys"
        ? "选择 Jev 调用渠道，并独立管理仅保存在本机的凭证。"
        : menu === "data"
          ? "编辑浏览器配置，并按需启用 S3 自动同步。"
          : selectedStrategy
            ? `P${selectedStrategy.priority} · ${selectedStrategy.name}`
            : "分别管理时间线博文与评论区的策略表。";

  const navItem =
    "flex min-h-11 w-full items-center gap-3 rounded-[10px] border border-transparent px-3 text-left font-semibold text-muted transition hover:bg-panel hover:text-ink aria-[current=page]:border-signal/25 aria-[current=page]:bg-soft aria-[current=page]:text-signal";

  return (
    <div className="min-h-screen bg-canvas font-sans text-sm leading-[1.6] text-ink transition-colors sm:grid sm:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[224px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-surface p-[18px] transition-colors sm:sticky sm:top-0 sm:flex sm:h-screen sm:flex-col sm:border-r sm:border-b-0 sm:px-3.5 sm:py-7 xl:px-5 xl:pt-8 xl:pb-[22px]">
        <div className="flex items-center justify-between gap-3">
          <a
            className="flex items-center gap-3 font-display text-[23px] leading-none font-bold text-ink no-underline xl:text-[27px]"
            href="#general"
            onClick={() => setMenuPage("general")}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line-strong font-mono text-xs shadow-[inset_0_0_0_5px_var(--color-canvas)] xl:size-11">
              XF
            </span>
            <span>
              XFilter
              <small className="mt-1 block font-mono text-[7px] font-semibold tracking-[0.08em] text-signal">
                READ WITH INTENTION
              </small>
            </span>
          </a>
          {draft && (
            <div className="sm:hidden">
              <ThemeToggle
                value={draft.theme}
                disabled={form.busy}
                compact
                onChange={(nextTheme) =>
                  void form.save({ theme: nextTheme }, `已切换为${nextTheme === "dark" ? "深色" : "浅色"}主题。`)
                }
              />
            </div>
          )}
        </div>
        <div className="mx-3 mt-[54px] mb-3 hidden text-[11px] text-muted sm:block">工作空间</div>
        <nav className="mt-[18px] flex gap-2.5 sm:mt-0 sm:grid sm:gap-1.5" aria-label="Dashboard 菜单">
          <button
            className={navItem}
            aria-label="通用 General"
            aria-current={menu === "general" ? "page" : undefined}
            onClick={() => setMenuPage("general")}
          >
            <span className="w-[18px] text-xl leading-none xl:w-6 xl:text-2xl" aria-hidden="true">
              ⊞
            </span>
            通用<small className="ml-auto hidden font-mono text-[9px] font-normal xl:block">General</small>
          </button>
          <button
            className={navItem}
            aria-label="API Keys"
            aria-current={menu === "api-keys" ? "page" : undefined}
            onClick={() => setMenuPage("api-keys")}
          >
            <span className="w-[18px] text-xl leading-none xl:w-6 xl:text-2xl" aria-hidden="true">
              ⌘
            </span>
            API Keys<small className="ml-auto hidden font-mono text-[9px] font-normal xl:block">Providers</small>
          </button>
          <button
            className={navItem}
            aria-label="策略 Strategies"
            aria-current={menu === "strategies" ? "page" : undefined}
            onClick={() => setMenuPage("strategies")}
          >
            <span className="w-[18px] text-xl leading-none xl:w-6 xl:text-2xl" aria-hidden="true">
              ≋
            </span>
            策略<small className="ml-auto hidden font-mono text-[9px] font-normal xl:block">Strategies</small>
          </button>
          <button
            className={navItem}
            aria-label="数据 Data"
            aria-current={menu === "data" ? "page" : undefined}
            onClick={() => setMenuPage("data")}
          >
            <span className="w-[18px] text-xl leading-none xl:w-6 xl:text-2xl" aria-hidden="true">
              ⌁
            </span>
            数据<small className="ml-auto hidden font-mono text-[9px] font-normal xl:block">Data</small>
          </button>
        </nav>
        <div className="mt-auto hidden px-2.5 pt-6 text-[11px] text-muted sm:block">
          <div className="mb-4 flex items-center justify-between gap-2">
            <span>
              <i className="mr-[7px] inline-block size-1.5 rounded-full bg-signal" />
              本地工作空间
            </span>
            {draft && (
              <ThemeToggle
                value={draft.theme}
                disabled={form.busy}
                compact
                onChange={(nextTheme) =>
                  void form.save({ theme: nextTheme }, `已切换为${nextTheme === "dark" ? "深色" : "浅色"}主题。`)
                }
              />
            )}
          </div>
          <p className="text-[10px] leading-[1.9]">
            配置保存在当前浏览器。
            <br />
            预览不会产生 API 消耗。
          </p>
          <span className="mt-6 flex justify-between border-t border-line pt-3.5 font-mono text-[9px]">
            XFilter / 0.1 <span>Dashboard</span>
          </span>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-[1540px] min-w-0 px-4 pt-6 pb-5 min-[1600px]:pt-[50px] sm:px-6 sm:pt-7 sm:pb-[22px] xl:px-[clamp(24px,3.8vw,64px)] xl:pt-[38px] xl:pb-6">
        <header className="flex items-start justify-between gap-2.5 border-b border-line pb-5 sm:items-center sm:gap-5">
          <div>
            <p className={eyebrow}>
              WORKSPACE /{" "}
              {menu === "general"
                ? "GENERAL"
                : menu === "api-keys"
                  ? "API KEYS"
                  : menu === "data"
                    ? "DATA"
                    : selectedStrategy
                      ? "STRATEGIES / EDIT"
                      : "STRATEGIES"}
            </p>
            <h1 className="mt-2.5 mb-[7px] text-[27px] font-semibold tracking-[-0.045em] sm:text-3xl">{pageTitle}</h1>
            <p className="text-[11px] text-muted sm:text-[13px]">{pageDescription}</p>
          </div>
          <span
            className="mt-1.5 text-[9px] whitespace-nowrap text-muted before:mr-2 before:inline-block before:size-1.5 before:rounded-full before:bg-signal before:content-[''] data-[dirty=true]:before:bg-amber-600 sm:mt-0 sm:text-[11px]"
            data-dirty={form.dirty}
          >
            {form.busy ? "正在保存…" : form.dirty ? "有未保存的更改" : "已与本地同步"}
          </span>
        </header>
        <div
          className={cn("min-h-9 py-2 text-xs text-signal", form.status.error && "text-alert")}
          role={form.status.error ? "alert" : "status"}
        >
          {form.status.message}
        </div>
        {!draft ? (
          <div className={card} role="status">
            {form.loadFailed ? (
              <>
                无法加载设置。
                <button className={textButton} onClick={() => location.reload()}>
                  重新加载
                </button>
              </>
            ) : (
              "正在加载本地设置…"
            )}
          </div>
        ) : menu === "general" ? (
          <GeneralPanel
            settings={draft}
            busy={form.busy}
            onChange={form.update}
            onToggle={(key, checked) => void form.toggle(key, checked)}
            onSave={saveGeneral}
          />
        ) : menu === "api-keys" ? (
          <ApiKeysPanel
            settings={draft}
            busy={form.busy}
            onProviderChange={(providerId) =>
              form.save(
                { activeProvider: providerId },
                `已切换到 ${providerId === "vercel-ai-gateway" ? "Vercel AI Gateway" : providerId === "typesafe" ? "TypeSafe 官方" : "OpenRouter"}。`,
              )
            }
            onStatus={form.setStatus}
          />
        ) : menu === "data" ? (
          <DataPanel onConfigurationApplied={form.reload} />
        ) : (
          <>
            <StrategyTabs
              value={strategySurface}
              counts={strategyCounts}
              onChange={(surface) => {
                setStrategySurface(surface);
                setSelectedStrategyId(null);
              }}
            />
            <div
              id={`strategy-panel-${strategySurface}`}
              role="tabpanel"
              aria-labelledby={`strategy-tab-${strategySurface}`}
            >
              {selectedStrategy ? (
                <StrategyPanel
                  strategy={selectedStrategy}
                  strategyCount={surfaceStrategies.length}
                  surface={strategySurface}
                  modelNickname={draft.modelNickname}
                  modelId={PROVIDERS[draft.activeProvider].modelId}
                  busy={form.busy}
                  onBack={() => setSelectedStrategyId(null)}
                  onChange={updateSelectedStrategy}
                  onPriorityChange={changeSelectedPriority}
                  onSave={saveSelectedStrategy}
                />
              ) : (
                <StrategyList
                  surface={strategySurface}
                  strategies={surfaceStrategies}
                  busy={form.busy}
                  dirty={libraryDirty}
                  onChange={updateSurfaceStrategies}
                  onOpen={setSelectedStrategyId}
                  onCreate={createNewStrategy}
                  onSave={saveLibrary}
                />
              )}
            </div>
          </>
        )}
        <footer className="mt-[42px] flex justify-between gap-3 border-t border-line pt-[18px] text-[9px] text-muted sm:text-[10px]">
          <span>XFilter · 为有意义的内容留白</span>
          <span>所有策略均由你掌控</span>
        </footer>
      </main>
    </div>
  );
}
