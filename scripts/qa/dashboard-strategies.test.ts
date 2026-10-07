import { expect, test } from "bun:test";
import { defaultStrategy, normalizeSettings } from "../../src/shared";
import { previewBrowser } from "./preview-browser";

const previewUrl = process.env.DASHBOARD_FEEDBACK_PREVIEW_URL;
const longName = "VeryLongStrategyNameWithoutSpacesForLayoutAndInteractionChecks".slice(0, 60);

test.skipIf(!previewUrl)(
  "strategy controls remain reachable with long text, narrow windows and keyboard input",
  async () => {
    const url = new URL(previewUrl!);
    expect(["localhost", "127.0.0.1"]).toContain(url.hostname);
    expect(url.pathname).toBe("/dashboard.html");
    const browser = previewBrowser("strategies");
    const click = (name: string) => browser("find", "role", "button", "click", "--name", name, "--exact");
    const settings = normalizeSettings({
      strategies: [
        {
          ...defaultStrategy("timeline", 1, "long"),
          name: longName,
          prompt: "长文本布局检查".repeat(1000).slice(0, 6000),
        },
        { ...defaultStrategy("timeline", 2, "short"), name: "简洁策略", enabled: false },
        { ...defaultStrategy("comments", 1, "comment"), name: "评论策略" },
      ],
    });
    const settle = () =>
      browser("eval", "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
    const gotoStrategies = async (locale: string, width: number) => {
      await browser("set", "viewport", String(width), "1000");
      await browser("eval", `chrome.storage.local.set({'xflow.uiLocale':${JSON.stringify(locale)}})`);
      if (width < 768) {
        await click(locale === "en" ? "Open navigation" : "打开菜单");
        await browser("wait", "--fn", "document.querySelector('.astryx-side-nav')?.getBoundingClientRect().x >= 0");
      }
      await click(locale === "en" ? "Strategies" : "策略");
      await settle();
      expect(await browser("eval", "document.querySelector('h1').textContent")).toBe(
        locale === "en" ? "Strategy management" : "策略管理",
      );
    };
    try {
      await browser("open", url.href);
      expect(await browser("eval", "chrome.runtime.id")).toBe("dashboard-preview");
      await browser(
        "eval",
        `localStorage.clear();localStorage.setItem('xflow-dashboard-preview',${JSON.stringify(JSON.stringify(settings))});`,
      );
      await browser("reload");
      await browser("set", "media", "light", "reduced-motion");
      for (const locale of ["zh-CN", "en"]) {
        for (const width of [320, 375, 1024, 1280, 1440]) {
          await gotoStrategies(locale, width);
          const layout = await browser(
            "eval",
            `(() => {
            const root=document.querySelector('[aria-labelledby="strategy-table-title"]');
            const controls=[...root.querySelectorAll('tbody button,tbody input[role="switch"],[data-strategy-id] button,[data-strategy-id] input[role="switch"]')].filter(e=>e.getBoundingClientRect().height>0);
            return {
              overflow:document.documentElement.scrollWidth>innerWidth,
              table:!!root.querySelector('table'),
              targets:controls.map(e=>{const r=e.getBoundingClientRect(),cell=e.closest('td')||e.closest('li'),c=cell?.getBoundingClientRect();
                const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
                return {label:e.getAttribute('aria-label')||e.textContent, width:r.width,height:r.height,
                  within:r.x>=0&&r.right<=innerWidth&&(!c||r.right<=c.right+1),
                  reachable:r.y>=innerHeight||e===hit||e.contains(hit)};
              })
            };
          })()`,
          );
          expect(layout.overflow).toBe(false);
          expect(layout.table).toBe(width >= 1280);
          for (const target of layout.targets) {
            expect(target.within).toBe(true);
            expect(target.reachable).toBe(true);
            expect(target.height).toBeGreaterThanOrEqual(width >= 1280 ? 32 : 44);
          }
          await click(locale === "en" ? `Edit strategy ${longName}` : `编辑策略 ${longName}`);
          await browser("wait", '[data-field="strategy-name"]');
          expect(await browser("eval", "document.documentElement.scrollWidth <= innerWidth")).toBe(true);
          const options = await browser(
            "eval",
            "[...document.querySelectorAll('#strategy-settings [role=radio]')].filter(e=>e.getBoundingClientRect().height>0).map(e=>({height:e.getBoundingClientRect().height,overflow:e.querySelector('span').scrollWidth>e.querySelector('span').clientWidth}))",
          );
          expect(options).toHaveLength(3);
          for (const option of options) {
            expect(option.height).toBeGreaterThanOrEqual(32);
            expect(option.overflow).toBe(false);
          }
        }
      }
      await gotoStrategies("zh-CN", 375);
      await browser("fill", '[data-field="strategies-search"]', "简洁");
      await click("提高 简洁策略 的优先级");
      await browser("find", "role", "switch", "click", "--name", "启用 简洁策略", "--exact");
      await click("保存");
      await browser("wait", "--fn", "(async()=> (await chrome.storage.local.get(null)).strategies[0].id==='short')()");
      expect(
        await browser(
          "eval",
          "(async()=> (await chrome.storage.local.get(null)).strategies.map(({id,enabled,priority})=>({id,enabled,priority})))()",
        ),
      ).toEqual([
        { id: "short", enabled: true, priority: 1 },
        { id: "long", enabled: true, priority: 2 },
        { id: "comment", enabled: true, priority: 1 },
      ]);
      await browser("focus", 'button[aria-label="编辑策略 简洁策略"]');
      await browser("press", "Enter");
      await browser("wait", '[data-field="strategy-name"]');
      const presets = await browser(
        "eval",
        "[...document.querySelectorAll('#strategy-settings [role=radio]')].filter(e=>e.getBoundingClientRect().height>0).map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,overflow:e.querySelector('span').scrollWidth>e.querySelector('span').clientWidth}))",
      );
      expect(presets).toHaveLength(3);
      expect(new Set(presets.map((p: { w: number }) => Math.round(p.w))).size).toBe(1);
      for (const preset of presets) {
        expect(preset.h).toBeGreaterThanOrEqual(32);
        expect(preset.overflow).toBe(false);
      }
      await browser("click", '#strategy-settings [role=radio][data-value="50"]');
      expect(await browser("eval", "document.querySelector('[data-field=strategy-hit-rate-input]').value")).toBe("50");
      await browser("focus", '#strategy-settings [role=radio][data-value="50"]');
      await browser("press", "ArrowLeft");
      expect(await browser("eval", "document.querySelector('[data-field=strategy-hit-rate-input]').value")).toBe("70");
      await click("遮罩外观");
      await browser("fill", '[data-field="hover-template"]', "Preview");
      await click("插入 strategy.name");
      expect(await browser("eval", "document.querySelector('[data-field=hover-template]').value")).toBe(
        "Preview {{strategy.name}}",
      );
      await click("保存策略");
      await browser(
        "wait",
        "--fn",
        "(async()=> (await chrome.storage.local.get(null)).strategies[0].hoverTemplate==='Preview {{strategy.name}}')()",
      );
      await gotoStrategies("zh-CN", 375);
      await browser("fill", '[data-field="strategies-search"]', "简洁");
      await click("删除: 简洁策略");
      await click("保存");
      await browser("wait", "--fn", "(async()=> (await chrome.storage.local.get(null)).strategies.length===2)()");
      expect(
        await browser("eval", "(async()=> (await chrome.storage.local.get(null)).strategies.map(s=>s.id))()"),
      ).toEqual(["long", "comment"]);
    } finally {
      await browser("close");
    }
  },
  180_000,
);
