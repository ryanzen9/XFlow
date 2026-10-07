import { expect, test } from "bun:test";
import { localDayKey, normalizeSettings, type ActivityEvent } from "../../src/shared";
import { previewBrowser } from "./preview-browser";

const previewUrl = process.env.DASHBOARD_FEEDBACK_PREVIEW_URL;

test.skipIf(!previewUrl)(
  "compact popup keeps whole-row controls, feedback and settings access usable",
  async () => {
    const url = new URL("/popup.html", previewUrl!);
    expect(["localhost", "127.0.0.1"]).toContain(url.hostname);
    const browser = previewBrowser("popup");
    const click = (name: string) => browser("find", "role", "button", "click", "--name", name, "--exact");
    const now = Date.now();
    const event: ActivityEvent = {
      id: "popup-qa-event",
      contentId: "popup-qa-post",
      deviceId: "popup-qa-device",
      day: localDayKey(now),
      filteredAt: now,
      updatedAt: now,
      surface: "timeline",
      status: "filtered",
    };
    const settings = normalizeSettings({ enabled: true, commentsEnabled: false });
    try {
      await browser("open", url.href);
      expect(await browser("eval", "chrome.runtime.id")).toBe("dashboard-preview");
      await browser("set", "viewport", "320", "400");
      await browser("set", "media", "light", "reduced-motion");
      await browser(
        "eval",
        `localStorage.clear();localStorage.setItem('xflow-dashboard-preview',${JSON.stringify(JSON.stringify({ ...settings, activityData: { schemaVersion: 1, clearedAt: 0, historyClearedAt: 0, archivedByDevice: { "popup-qa-device": 999_999_999 }, events: [event] } }))});`,
      );
      await browser("reload");
      await browser("wait", "--fn", "!document.querySelector('#enabled [role=switch]')?.disabled");
      for (const locale of ["zh-CN", "en"]) {
        await browser("eval", `chrome.storage.local.set({'xflow.uiLocale':${JSON.stringify(locale)}})`);
        for (const theme of ["light", "dark"]) {
          await browser("eval", `chrome.storage.local.set({theme:${JSON.stringify(theme)}})`);
          const layout = await browser(
            "eval",
            `(() => {
            const button=[...document.querySelectorAll('main button')].at(-1),r=button.getBoundingClientRect();
            const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
            return {overflow:document.documentElement.scrollWidth>innerWidth, height:document.querySelector('main').getBoundingClientRect().height,
              buttonHeight:r.height, visible:r.bottom<=innerHeight, reachable:hit===button||button.contains(hit),
              rows:[...document.querySelectorAll('[data-slot$="-filter-control"]')].map(e=>e.getBoundingClientRect().height),
              switches:[...document.querySelectorAll('[role=switch]')].map(e=>e.getBoundingClientRect().height),
              allTime:document.querySelector('[aria-label="${locale === "en" ? "Filtering activity" : "过滤活动"}"]')?.textContent};
          })()`,
          );
          expect(layout.overflow).toBe(false);
          expect(layout.height).toBeLessThanOrEqual(400);
          expect(layout.buttonHeight).toBeGreaterThanOrEqual(40);
          expect(layout.visible).toBe(true);
          expect(layout.reachable).toBe(true);
          expect(layout.rows).toHaveLength(2);
          expect(layout.rows.every((height: number) => height >= 48)).toBe(true);
          expect(layout.switches.every((height: number) => height >= 44)).toBe(true);
          expect(layout.allTime).toContain("1,000,000,000");
        }
      }
      await browser("eval", "chrome.storage.local.set({'xflow.uiLocale':'zh-CN',theme:'light'})");
      await browser("click", '[data-slot="enabled-filter-control"]');
      await browser("wait", "--fn", "(async()=> (await chrome.storage.local.get(null)).enabled===false)()");
      expect(await browser("eval", "document.querySelector('#enabled [role=switch]').checked")).toBe(false);
      expect(await browser("eval", "document.querySelector('#save-status').classList.contains('sr-only')")).toBe(true);
      await browser("focus", "#comments-enabled [role=switch]");
      await browser("press", "Space");
      await browser("wait", "--fn", "(async()=> (await chrome.storage.local.get(null)).commentsEnabled===true)()");
      expect(await browser("eval", "document.querySelector('#comments-enabled [role=switch]').checked")).toBe(true);
      await browser(
        "eval",
        "window.__originalSave=chrome.storage.local.set;chrome.storage.local.set=async()=>{throw new Error('simulated persistence failure')}",
      );
      await browser("click", '[data-slot="enabled-filter-control"]');
      await browser("wait", "--fn", "document.querySelector('#save-status').classList.contains('text-error')");
      expect(await browser("eval", "document.querySelector('#enabled [role=switch]').checked")).toBe(false);
      expect(await browser("eval", "document.querySelector('#save-status').textContent")).toContain("失败");
      expect(await browser("eval", "document.documentElement.scrollWidth <= innerWidth")).toBe(true);
      await browser("eval", "chrome.storage.local.set=window.__originalSave");
      await click("控制台");
      await browser("wait", "--url", "**/dashboard.html");
      expect(await browser("eval", "location.pathname")).toBe("/dashboard.html");
    } finally {
      await browser("close");
    }
  },
  90_000,
);
