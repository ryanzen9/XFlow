import { expect, test } from "bun:test";
import { defaultStrategy, localDayKey, normalizeSettings, type ActivityEvent } from "../../src/shared";
import { previewBrowser } from "./preview-browser";

const previewUrl = process.env.DASHBOARD_FEEDBACK_PREVIEW_URL;

test.skipIf(!previewUrl)(
  "dashboard templates preserve settings, filtering and responsive layouts",
  async () => {
    const url = new URL(previewUrl!);
    expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
    expect(url.pathname).toBe("/dashboard.html");
    const browser = previewBrowser("pages");
    const click = (name: string) => browser("find", "role", "button", "click", "--name", name, "--exact");
    const settle = () =>
      browser("eval", "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
    const choose = async (label: string, value: string) => {
      await browser("find", "role", "combobox", "click", "--name", label, "--exact");
      await browser("find", "role", "option", "click", "--name", value, "--exact");
      await settle();
    };
    const metric = (label: string) =>
      browser(
        "eval",
        `Array.from(document.querySelectorAll('dl')).find(el=>el.querySelector('dt')?.textContent===${JSON.stringify(label)})?.querySelector('dd')?.textContent`,
      );
    const now = Date.now();
    const events: ActivityEvent[] = Array.from({ length: 24 }, (_, index) => ({
      id: `event-${index}`,
      contentId: `post-${index}`,
      day: localDayKey(now),
      filteredAt: now - index * 1000,
      updatedAt: now - index * 1000,
      deviceId: "qa-device",
      surface: index % 2 ? "comments" : "timeline",
      status: index % 3 === 0 ? "incorrect" : index % 3 === 1 ? "revealed" : "filtered",
      author: `@reader${index}`,
      preview: `QA record ${index}`,
      policyName: index % 2 ? "Comment policy" : "Timeline policy",
    }));
    const settings = normalizeSettings({
      strategies: [
        { ...defaultStrategy("timeline", 1, "timeline-a"), name: "Tech 分享", prompt: "过滤广告" },
        { ...defaultStrategy("timeline", 2, "timeline-b"), name: "生活观察", enabled: false },
        { ...defaultStrategy("comments", 1, "comments-a"), name: "评论净化" },
      ],
    });
    try {
      await browser("open", url.href);
      expect(await browser("eval", "chrome.runtime.id")).toBe("dashboard-preview");
      await browser("set", "viewport", "1440", "1000");
      await browser(
        "eval",
        `localStorage.clear(); localStorage.setItem('xflow.uiLocale','zh-CN'); localStorage.setItem('xflow-dashboard-preview', ${JSON.stringify(JSON.stringify({ ...settings, activityData: { schemaVersion: 1, clearedAt: 0, historyClearedAt: 0, archivedByDevice: {}, events } }))});`,
      );
      await browser("reload");
      await browser("wait", ".astryx-table");
      await browser(
        "eval",
        "window.__pageErrors=[]; addEventListener('error',event=>window.__pageErrors.push(event.message),true); addEventListener('unhandledrejection',event=>window.__pageErrors.push(String(event.reason)))",
      );
      expect(await metric("今日屏蔽")).toBe("24");
      expect(await metric("近 7 天过滤")).toBe("24");
      expect(await metric("30 天活跃天数")).toBe("1");
      expect(await browser("eval", "document.querySelectorAll('.astryx-table tbody tr').length")).toBe(5);
      await choose("统计范围", "评论区");
      expect(await metric("今日屏蔽")).toBe("12");
      expect(await metric("30 天屏蔽")).toBe("12");
      expect(
        await browser(
          "eval",
          "[...document.querySelectorAll('.astryx-table tbody tr')].every(row=>row.textContent.includes('Comment policy'))",
        ),
      ).toBe(true);

      const chartHeight = await browser(
        "eval",
        "document.querySelector('#activity-visualization').getBoundingClientRect().height",
      );
      await click("查看趋势");
      expect(
        await browser("eval", "document.querySelector('#activity-visualization').getBoundingClientRect().height"),
      ).toBe(chartHeight);

      await click("通用");
      expect(await browser("eval", "Boolean(document.querySelector('#activity-visualization'))")).toBe(false);
      await browser("fill", '[data-field="model-nickname"]', "Quiet reader");
      await click("保存");
      await browser("wait", "--fn", "document.querySelector('button[form=general-settings]').disabled");
      expect(await browser("eval", "(async()=> (await chrome.storage.local.get(null)).modelNickname)()")).toBe(
        "Quiet reader",
      );
      expect(
        await browser(
          "eval",
          "document.querySelector('h1').getBoundingClientRect().x === document.querySelector('h2').getBoundingClientRect().x",
        ),
      ).toBe(true);

      await browser("fill", '[data-field="model-nickname"]', "Keyboard reader");
      await browser("press", "Enter");
      await browser(
        "wait",
        "--fn",
        "(async()=> (await chrome.storage.local.get(null)).modelNickname==='Keyboard reader')()",
      );
      expect(await browser("eval", "(async()=> (await chrome.storage.local.get(null)).modelNickname)()")).toBe(
        "Keyboard reader",
      );

      await click("策略");
      await browser("fill", '[data-field="strategies-search"]', "生活");
      expect(await browser("eval", "document.querySelectorAll('.astryx-table tbody tr').length")).toBe(1);
      await click("提高 生活观察 的优先级");
      await click("保存");
      await browser(
        "wait",
        "--fn",
        "(async()=> (await chrome.storage.local.get(null)).strategies[0].id==='timeline-b')()",
      );
      const priorities = await browser(
        "eval",
        "(async()=> (await chrome.storage.local.get(null)).strategies.map(({id,priority})=>({id,priority})))()",
      );
      expect(priorities).toEqual([
        { id: "timeline-b", priority: 1 },
        { id: "timeline-a", priority: 2 },
        { id: "comments-a", priority: 1 },
      ]);
      await browser("fill", '[data-field="strategies-search"]', "no matching strategy");
      expect(await browser("eval", "document.body.textContent.includes('没有匹配的结果')")).toBe(true);
      await click("清除筛选");
      expect(await browser("eval", "document.querySelectorAll('.astryx-table tbody tr').length")).toBe(2);
      await choose("状态筛选", "已停用");
      expect(await browser("eval", "document.querySelectorAll('.astryx-table tbody tr').length")).toBe(1);
      await click("编辑策略 生活观察");
      await browser("fill", '[data-field="strategy-name"]', "生活精选");
      await click("保存策略");
      await browser(
        "wait",
        "--fn",
        "(async()=> (await chrome.storage.local.get(null)).strategies.some(s=>s.name==='生活精选'))()",
      );
      await browser("set", "media", "light", "reduced-motion");
      expect(await browser("eval", "matchMedia('(prefers-reduced-motion: reduce)').matches")).toBe(true);
      await click("遮罩外观");
      await browser(
        "wait",
        "--fn",
        "document.querySelector('#strategy-settings').closest('.astryx-layout-content').scrollHeight > document.querySelector('#strategy-settings').closest('.astryx-layout-content').clientHeight",
      );
      const pinned = await browser(
        "eval",
        `const button=document.querySelector('button[form="strategy-settings"]'); const before=button.getBoundingClientRect().y; const content=document.querySelector('#strategy-settings').closest('.astryx-layout-content'); content.scrollTop=500; [before,button.getBoundingClientRect().y,content.scrollTop];`,
      );
      expect(pinned[0]).toBe(pinned[1]);
      expect(pinned[2]).toBeGreaterThan(0);
      await browser("fill", '[data-field="hover-template"]', "{{unsupported.variable}}");
      expect(await browser("eval", "document.querySelector('button[form=strategy-settings]').disabled")).toBe(true);

      await click("日志");
      await click("下一页");
      await browser("fill", '[data-field="history-search"]', "@reader22");
      expect(await browser("eval", "document.body.textContent.includes('显示 1–1，共 1 条')")).toBe(true);
      await click("清除搜索内容、作者或策略");
      await choose("状态筛选", "已标记误判");
      expect(
        await browser(
          "eval",
          "({query:document.querySelector('[data-field=history-search]').value, range:[...document.querySelectorAll('[aria-live=polite]')].map(el=>el.textContent).find(text=>text?.startsWith('显示')) ?? null, status:document.querySelector('[role=combobox]')?.textContent})",
        ),
      ).toEqual({ query: "", range: "显示 1–8，共 8 条", status: "已标记误判" });

      await click("API Keys");
      expect(await browser("eval", "document.querySelector('[data-field=provider-key-openrouter]').type")).toBe(
        "password",
      );
      await click("显示OpenRouter API Key");
      expect(await browser("eval", "document.querySelector('[data-field=provider-key-openrouter]').type")).toBe("text");
      await click("数据");
      await browser("wait", '[data-field="config-json"]');
      expect(await browser("eval", "document.querySelector('[data-field=s3-secret-key]').type")).toBe("password");
      await click("临时凭据");
      expect(
        await browser(
          "eval",
          "document.querySelector('[data-field=s3-session-token]').getBoundingClientRect().height > 0",
        ),
      ).toBe(true);

      for (const width of [375, 320, 1024]) {
        await browser("set", "viewport", String(width), "900");
        for (const [menu, title] of [
          ["概览", "过滤概览"],
          ["通用", "通用设置"],
          ["API Keys", "API Keys"],
          ["策略", "策略管理"],
          ["数据", "数据与同步"],
          ["日志", "日志"],
        ]) {
          if (width < 768) await click("打开菜单");
          await click(menu!);
          await settle();
          expect(await browser("eval", "document.querySelector('h1').textContent")).toBe(title);
          expect(await browser("eval", "document.documentElement.scrollWidth <= innerWidth")).toBe(true);
        }
      }
      await browser("set", "viewport", "1440", "1000");
      await click("切换为英文");
      await click("Switch to dark theme");
      for (const [menu, title] of [
        ["Overview", "Filtering overview"],
        ["General", "General settings"],
        ["API Keys", "API Keys"],
        ["Strategies", "Strategy management"],
        ["Data", "Data & sync"],
        ["Log", "Log"],
      ]) {
        await click(menu!);
        await settle();
        expect(await browser("eval", "document.querySelector('h1').textContent")).toBe(title);
        expect(await browser("eval", "document.documentElement.scrollWidth <= innerWidth")).toBe(true);
      }
      await browser(
        "eval",
        "window.__originalGet=chrome.storage.local.get; chrome.storage.local.get=async(keys)=>{if(Array.isArray(keys)&&keys.includes('activityData')) throw new Error('simulated read failure'); return window.__originalGet(keys);}",
      );
      await click("Overview");
      await browser("wait", '.astryx-banner-frame[role="alert"]');
      expect(await browser("eval", "[...document.querySelectorAll('dl dd')].map(el=>el.textContent)")).toEqual([
        "—",
        "—",
        "—",
        "—",
      ]);
      await browser("eval", "chrome.storage.local.get=window.__originalGet");
      await browser(
        "eval",
        "(async()=>{const data=(await chrome.storage.local.get(null)).activityData; data.events[0].updatedAt+=1; await chrome.storage.local.set({activityData:data});})()",
      );
      await browser("wait", ".astryx-table");
      expect(await metric("Blocked today")).toBe("24");
      expect(await browser("eval", "Boolean(document.querySelector('.astryx-banner-frame[role=alert]'))")).toBe(false);
      await browser(
        "eval",
        "window.__originalMessage=chrome.runtime.sendMessage; chrome.runtime.sendMessage=async(message)=>message.type==='CLEAR_ACTIVITY_DATA'?{ok:false,code:'INTERNAL_ERROR'}:window.__originalMessage(message)",
      );
      await click("Clear Activity Data");
      await click("Clear");
      await browser("wait", '.astryx-banner-frame[role="alert"]');
      expect(await metric("Blocked today")).toBe("24");
      await browser("eval", "chrome.runtime.sendMessage=window.__originalMessage");
      expect(await browser("eval", "window.__pageErrors")).toEqual([]);
    } finally {
      await browser("close");
    }
  },
  180_000,
);
