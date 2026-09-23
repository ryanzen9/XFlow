import { useEffect, useState } from "react";
import {
  PROVIDERS,
  compileHoverCss,
  createStrategy,
  reindexStrategies,
  validateTemplate,
  type FilterStrategy,
  type FilterSurface,
} from "../shared";
import { cn } from "../ui/cn";
import { LanguageToggle, localizeError, providerLabel, useI18n } from "../ui/i18n";
import { card, eyebrow, textButton } from "../ui/styles";
import { ThemeToggle, applyTheme } from "../ui/theme";
import { ApiKeysPanel } from "./components/ApiKeysPanel";
import { DataPanel } from "./components/DataPanel";
import { GeneralPanel } from "./components/GeneralPanel";
import { LogPanel } from "./components/LogPanel";
import { StrategyList } from "./components/StrategyList";
import { StrategyPanel } from "./components/StrategyPanel";
import { StrategyTabs } from "./components/StrategyTabs";
import { useDashboard } from "./hooks/use-dashboard";

type MenuPage = "general" | "api-keys" | "strategies" | "data" | "log";

export function App() {
  const { locale, t } = useI18n();
  const [menu, setMenu] = useState<MenuPage>("general");
  const [strategySurface, setStrategySurface] = useState<FilterSurface>("timeline");
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const form = useDashboard();
  const { draft, saved } = form;
  const theme = draft?.theme;
  const menuItems: { id: MenuPage; label: string; icon: string }[] = [
    { id: "general", label: t("nav.general"), icon: "⊞" },
    { id: "api-keys", label: t("nav.apiKeys"), icon: "⌘" },
    { id: "strategies", label: t("nav.strategies"), icon: "≋" },
    { id: "data", label: t("nav.data"), icon: "⌁" },
    { id: "log", label: t("nav.log"), icon: "≡" },
  ];
  const strategyError = (strategy: FilterStrategy): string | null => {
    if (!strategy.name.trim() || !strategy.prompt.trim() || !strategy.hoverTemplate.trim()) {
      return t("strategy.required");
    }
    if (strategy.surfaces.length === 0) return t("strategy.surfaceRequired");
    const validationError =
      compileHoverCss(strategy.hoverCss, "#validation").error || validateTemplate(strategy.hoverTemplate);
    return validationError ? localizeError(locale, validationError, "strategy.validationFailed") : null;
  };
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

  const setMenuPage = (nextMenu: MenuPage) => {
    setMenu(nextMenu);
    if (nextMenu === "strategies") setSelectedStrategyId(null);
  };

  const saveGeneral = () => {
    if (!draft) return;
    const modelNickname = draft.modelNickname.trim();
    if (!modelNickname) {
      form.setStatus({ message: t("general.nicknameRequired"), error: true });
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
      form.setStatus({
        message: `${invalid.name}：${strategyError(invalid)}`,
        error: true,
      });
      return;
    }
    void form.save({ strategies: reindexStrategies(draft.strategies) }, t("strategy.librarySaved"));
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
          ? {
              ...selectedStrategy,
              name: selectedStrategy.name.trim(),
              prompt: selectedStrategy.prompt.trim(),
            }
          : strategy,
      ),
    );
    void form.save({ strategies }, t("strategy.saved", { name: selectedStrategy.name.trim() }));
  };

  const page = {
    general: {
      title: t("page.general.title"),
      description: t("page.general.description"),
      eyebrow: "GENERAL",
    },
    "api-keys": {
      title: "API Keys",
      description: t("page.apiKeys.description"),
      eyebrow: "API KEYS",
    },
    strategies: selectedStrategy
      ? {
          title: t("page.strategies.edit"),
          description: `P${selectedStrategy.priority} · ${selectedStrategy.name}`,
          eyebrow: "STRATEGIES / EDIT",
        }
      : {
          title: t("page.strategies.title"),
          description: t("page.strategies.description"),
          eyebrow: "STRATEGIES",
        },
    data: {
      title: t("page.data.title"),
      description: t("page.data.description"),
      eyebrow: "DATA",
    },
    log: {
      title: t("nav.log"),
      description: t("page.log.description"),
      eyebrow: "LOG",
    },
  }[menu];

  const navItem =
    "flex min-h-11 w-full items-center gap-3 rounded-md border border-transparent px-3 text-left font-semibold text-muted transition hover:bg-hover hover:text-ink aria-[current=page]:border-line-strong aria-[current=page]:bg-selected aria-[current=page]:text-ink";

  return (
    <div className="min-h-screen bg-canvas font-sans text-sm leading-[1.6] text-ink transition-colors sm:grid sm:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-[224px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-surface p-[18px] transition-colors sm:sticky sm:top-0 sm:flex sm:h-screen sm:flex-col sm:border-r sm:border-b-0 sm:px-3.5 sm:py-7 xl:px-5 xl:pt-8 xl:pb-[22px]">
        <div className="mb-6 flex items-center gap-2.5 border-b border-line pb-5">
          <img
            className="size-9 rounded-full border border-line-strong object-cover"
            src={theme === "dark" ? "logo.png" : "logo-dark.png"}
            alt="XFlow logo"
          />
          <div>
            <div className="font-display text-sm leading-none font-bold text-ink">XFlow</div>
            <div className="mt-1 font-mono text-caption text-muted">READ WITH INTENTION</div>
          </div>
        </div>
        <nav className="flex flex-wrap gap-2.5 sm:grid sm:gap-1.5" aria-label={t("nav.menu")}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={navItem}
              aria-current={menu === item.id ? "page" : undefined}
              onClick={() => setMenuPage(item.id)}
            >
              <span className="w-[18px] text-xl leading-none xl:w-6 xl:text-2xl" aria-hidden="true">
                {item.icon}
              </span>
              <span className="text-ui">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-6 flex items-center justify-between gap-2 border-t border-line pt-5 sm:mt-auto sm:pt-6">
          <div className="flex gap-2">
            <LanguageToggle disabled={form.busy} compact />
            {draft && (
              <ThemeToggle
                value={draft.theme}
                disabled={form.busy}
                compact
                onChange={(nextTheme) =>
                  void form.save(
                    { theme: nextTheme },
                    t("status.themeChanged", {
                      theme: t(nextTheme === "dark" ? "theme.dark" : "theme.light"),
                    }),
                  )
                }
              />
            )}
          </div>
          <span className="font-mono text-caption text-muted">XFlow / 0.1</span>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-[1540px] min-w-0 px-4 pt-6 pb-5 min-[1600px]:pt-[50px] sm:px-6 sm:pt-7 sm:pb-[22px] xl:px-[clamp(24px,3.8vw,64px)] xl:pt-[38px] xl:pb-6">
        <header className="flex items-start justify-between gap-2.5 border-b border-line pb-5 sm:items-center sm:gap-5">
          <div>
            <p className={eyebrow}>WORKSPACE / {page.eyebrow}</p>
            <h1 className="mt-2.5 mb-[7px] text-title font-semibold sm:text-3xl">{page.title}</h1>
            <p className="text-xs text-muted sm:text-ui">{page.description}</p>
          </div>
          <span
            className="mt-1.5 text-caption whitespace-nowrap text-muted before:mr-2 before:inline-block before:size-1.5 before:rounded-full before:bg-fg-4 before:content-[''] data-[dirty=true]:before:bg-warn sm:mt-0 sm:text-xs"
            data-dirty={form.dirty}
          >
            {form.busy ? t("status.saving") : form.dirty ? t("status.unsaved") : t("status.synced")}
          </span>
        </header>
        <div
          className={cn("min-h-9 py-2 text-xs text-ink", form.status.error && "text-danger")}
          role={form.status.error ? "alert" : "status"}
        >
          {form.status.message}
        </div>
        {!draft ? (
          <div className={card} role="status">
            {form.loadFailed ? (
              <>
                {t("status.loadFailed")}
                <button className={textButton} onClick={() => location.reload()}>
                  {t("common.reload")}
                </button>
              </>
            ) : (
              t("status.loadingSettings")
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
                t("api.providerChanged", { provider: providerLabel(providerId, locale) }),
              )
            }
            onStatus={form.setStatus}
          />
        ) : menu === "data" ? (
          <DataPanel onConfigurationApplied={form.reload} />
        ) : menu === "log" ? (
          <LogPanel />
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
        <footer className="mt-[42px] flex justify-between gap-3 border-t border-line pt-[18px] text-caption text-muted sm:text-meta">
          <span>XFlow - build your X</span>
          <span>Created By Ryan Zeng</span>
        </footer>
      </main>
    </div>
  );
}
