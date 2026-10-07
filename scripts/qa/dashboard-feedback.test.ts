import { expect, test } from "bun:test";
import { previewBrowser } from "./preview-browser";

// Opt-in browser regression. Requires agent-browser and the isolated mock preview.
// DASHBOARD_FEEDBACK_PREVIEW_URL=http://127.0.0.1:43997/dashboard.html bun test scripts/qa/dashboard-feedback.test.ts
const previewUrl = process.env.DASHBOARD_FEEDBACK_PREVIEW_URL;

test.skipIf(!previewUrl)(
  "dashboard feedback is emitted for actions and never replayed by navigation",
  async () => {
    const url = new URL(previewUrl!);
    expect(["127.0.0.1", "localhost"]).toContain(url.hostname);
    expect(url.pathname).toBe("/dashboard.html");
    const browser = previewBrowser("feedback");
    const click = (name: string) => browser("find", "role", "button", "click", "--name", name, "--exact");
    const seen = async () => {
      await browser("eval", "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
      return (await browser("eval", "window.__feedbackMessages")) as string[];
    };
    const dismiss = async () => {
      await click("关闭通知");
      await browser("wait", "--fn", '!document.querySelector(".astryx-toast")');
    };

    try {
      await browser("open", url.href);
      expect(await browser("eval", "chrome.runtime.id")).toBe("dashboard-preview");
      await browser("eval", 'localStorage.clear(); localStorage.setItem("xflow.uiLocale", "zh-CN")');
      await browser("reload");
      await browser("wait", 'button[aria-label="切换为深色主题"]');
      await browser(
        "eval",
        `window.__feedbackMessages = [];
        const recorded = new WeakSet();
        new MutationObserver(records => {
          for (const record of records) for (const node of record.addedNodes) {
            if (!(node instanceof Element)) continue;
            const toasts = node.matches('.astryx-toast') ? [node] : [...node.querySelectorAll('.astryx-toast')];
            for (const toast of toasts) if (!recorded.has(toast)) {
              recorded.add(toast);
              window.__feedbackMessages.push(toast.textContent);
            }
          }
        }).observe(document.body, {childList: true, subtree: true});`,
      );

      await click("切换为深色主题");
      await browser("wait", ".astryx-toast");
      expect(await seen()).toEqual(["已切换为深色主题。"]);
      await click("API Keys");
      expect(await seen()).toHaveLength(1);
      await dismiss();

      for (const menu of ["概览", "API Keys", "策略", "数据", "日志", "通用", "策略"]) {
        await click(menu);
        expect(await seen()).toHaveLength(1);
      }
      await click("编辑策略 Home 内容净化");
      expect(await seen()).toHaveLength(1);
      await click("← 返回时间线博文表格");
      expect(await seen()).toHaveLength(1);
      await click("切换为英文");
      expect(await seen()).toHaveLength(1);
      await click("Switch to Chinese");
      expect(await seen()).toHaveLength(1);

      await click("切换为浅色主题");
      await browser("wait", ".astryx-toast");
      expect(await seen()).toEqual(["已切换为深色主题。", "已切换为浅色主题。"]);
      await dismiss();
      await browser(
        "eval",
        `window.__originalStorageSet = chrome.storage.local.set;
        chrome.storage.local.set = async () => { throw new Error('simulated storage failure'); };`,
      );
      await click("切换为深色主题");
      await browser("wait", '.astryx-banner-frame[role="alert"]');
      expect(await browser("eval", 'document.querySelector(".astryx-banner-frame[role=alert]").textContent')).toBe(
        "保存失败，草稿已保留。请重试。",
      );
      expect(await seen()).toHaveLength(2);
      await browser("eval", "chrome.storage.local.set = window.__originalStorageSet");
      await click("切换为深色主题");
      await browser("wait", ".astryx-toast");
      expect(await seen()).toHaveLength(3);
      expect(await browser("eval", 'Boolean(document.querySelector(".astryx-banner-frame[role=alert]"))')).toBe(false);
    } finally {
      await browser("close");
    }
  },
  120_000,
);
