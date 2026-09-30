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
import { AppShell } from "@astryxdesign/core/AppShell";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Layout, LayoutContent, LayoutFooter, LayoutHeader } from "@astryxdesign/core/Layout";
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { Database, KeyRound, ListFilter, ScrollText, Settings } from "lucide-react";
import { localizeError, providerLabel, useI18n } from "../ui/i18n";
import { applyTheme } from "../ui/theme";
import { DashboardLocale, DashboardPreferences, StatusMessage, Status } from "./components/DashboardUI";
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
  const menuItems = [
    { id: "general", label: t("nav.general"), icon: Settings },
    { id: "api-keys", label: t("nav.apiKeys"), icon: KeyRound },
    { id: "strategies", label: t("nav.strategies"), icon: ListFilter },
    { id: "data", label: t("nav.data"), icon: Database },
    { id: "log", label: t("nav.log"), icon: ScrollText },
  ] as const;
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
      document.querySelector<HTMLInputElement>('[data-field="model-nickname"]')?.focus();
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
    },
    "api-keys": {
      title: "API Keys",
      description: t("page.apiKeys.description"),
    },
    strategies: selectedStrategy
      ? {
          title: t("page.strategies.edit"),
          description: `P${selectedStrategy.priority} · ${selectedStrategy.name}`,
        }
      : {
          title: t("page.strategies.title"),
          description: t("page.strategies.description"),
        },
    data: {
      title: t("page.data.title"),
      description: t("page.data.description"),
    },
    log: {
      title: t("nav.log"),
      description: t("page.log.description"),
    },
  }[menu];

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  return (
    <DashboardLocale>
      {/* The sidebar becomes a modal drawer below md; forms cap at 960, data at 1180. */}
      <AppShell
        variant="section"
        height="fill"
        mobileNav={{ breakpoint: "md", isOpen: mobileNavOpen, onOpenChange: setMobileNavOpen }}
        sideNav={
          <SideNav
            aria-label={t("nav.menu")}
            header={
              <SideNavHeading
                heading="XFlow"
                subheading="Read with intention"
                icon={
                  <Avatar
                    src={theme === "dark" ? "logo.png" : "logo-dark.png"}
                    name="XFlow"
                    alt="XFlow logo"
                    size="sm"
                    shape="rounded"
                  />
                }
              />
            }
            footer={
              <VStack gap={2} padding={3}>
                <DashboardPreferences
                  theme={theme}
                  busy={form.busy}
                  onThemeChange={(nextTheme) =>
                    void form.save(
                      { theme: nextTheme },
                      t("status.themeChanged", { theme: t(nextTheme === "dark" ? "theme.dark" : "theme.light") }),
                    )
                  }
                />
                <Text type="supporting">XFlow / 0.1</Text>
              </VStack>
            }
          >
            <SideNavSection title={t("nav.menu")} isHeaderHidden>
              {menuItems.map((item) => (
                <SideNavItem
                  key={item.id}
                  label={item.label}
                  icon={item.icon}
                  isSelected={menu === item.id}
                  onClick={() => {
                    setMenuPage(item.id);
                    setMobileNavOpen(false);
                  }}
                />
              ))}
            </SideNavSection>
          </SideNav>
        }
      >
        <Layout
          padding={6}
          contentWidth={menu === "log" || menu === "strategies" || menu === "data" ? 1180 : 960}
          header={
            <LayoutHeader hasDivider>
              <HStack gap={4} hAlign="between" vAlign="start" wrap="wrap">
                <VStack gap={1}>
                  <Heading level={1}>{page.title}</Heading>
                  <Text as="p" color="secondary">
                    {page.description}
                  </Text>
                </VStack>
                <Status
                  variant={form.dirty ? "warning" : "neutral"}
                  label={form.busy ? t("status.saving") : form.dirty ? t("status.unsaved") : t("status.synced")}
                />
              </HStack>
            </LayoutHeader>
          }
          content={
            <LayoutContent key={`${menu}:${selectedStrategyId ?? "list"}`}>
              <VStack gap={6}>
                <StatusMessage message={form.status.message} error={form.status.error} />
                {!draft ? (
                  form.loadFailed ? (
                    <EmptyState
                      title={t("status.loadFailed")}
                      actions={<Button label={t("common.reload")} onClick={() => location.reload()} />}
                    />
                  ) : (
                    <Spinner label={t("status.loadingSettings")} />
                  )
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
                  <VStack gap={5}>
                    <StrategyTabs
                      value={strategySurface}
                      counts={strategyCounts}
                      onChange={(surface) => {
                        setStrategySurface(surface);
                        setSelectedStrategyId(null);
                      }}
                    />
                    <VStack
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
                    </VStack>
                  </VStack>
                )}
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack hAlign="between" gap={3} wrap="wrap">
                <Text type="supporting">XFlow — build your X</Text>
                <Text type="supporting">Created by Ryan Zeng</Text>
              </HStack>
            </LayoutFooter>
          }
        />
      </AppShell>
    </DashboardLocale>
  );
}
