import { expect, test } from "bun:test";
import { localDayKey, normalizeSettings } from "../../src/shared";
import { previewBrowser } from "./preview-browser";

const previewUrl = process.env.DASHBOARD_FEEDBACK_PREVIEW_URL;

test.skipIf(!previewUrl)(
  "merged health controls report results and clear only request diagnostics",
  async () => {
    const url = new URL(previewUrl!);
    expect(["localhost", "127.0.0.1"]).toContain(url.hostname);
    const browser = previewBrowser("health");
    const click = (name: string) => browser("find", "role", "button", "click", "--name", name, "--exact");
    const now = Date.now();
    const fixture = {
      ...normalizeSettings({}),
      "xflow.uiLocale": "en",
      activityData: {
        schemaVersion: 1,
        clearedAt: 0,
        historyClearedAt: 0,
        archivedByDevice: {},
        events: [
          {
            id: "sample",
            contentId: "sample",
            deviceId: "qa-device",
            day: localDayKey(now),
            filteredAt: now,
            updatedAt: now,
            surface: "timeline",
            status: "filtered",
          },
        ],
      },
    };
    try {
      await browser("open", url.href);
      expect(await browser("eval", "chrome.runtime.id")).toBe("dashboard-preview");
      await browser("set", "viewport", "1440", "1000");
      await browser("set", "media", "light", "reduced-motion");
      await browser(
        "eval",
        `localStorage.clear();localStorage.setItem('xflow-dashboard-preview',${JSON.stringify(JSON.stringify(fixture))})`,
      );
      await browser("reload");
      await click("API Keys");
      await browser(
        "wait",
        "--fn",
        "[...document.querySelectorAll('button')].some(b=>b.textContent==='Run health check'&&b.disabled)",
      );
      // Override only summaries, without creating or storing a credential.
      await browser(
        "eval",
        `window.__healthMessage=chrome.runtime.sendMessage;chrome.runtime.sendMessage=async message=>{
      if(message.type==='GET_PROVIDER_SUMMARIES'){const result=await window.__healthMessage(message);return {...result,providerSummaries:result.providerSummaries.map(p=>({...p,configured:p.id==='openrouter',keyHint:''}))};}
      if(message.type==='CHECK_PROVIDER_HEALTH'){
        if(window.__failHealth)return {ok:true,providerHealth:{providerId:'openrouter',healthy:false,checkedAt:Date.now(),latencyMs:42,errorCode:'billing'}};
        await new Promise(resolve=>window.__resolveHealth=resolve);
      }
      return window.__healthMessage(message);
    }`,
      );
      await click("Overview");
      await click("API Keys");
      await browser(
        "wait",
        "--fn",
        "[...document.querySelectorAll('button')].some(b=>b.textContent==='Run health check'&&!b.disabled)",
      );
      await click("Run health check");
      expect(
        await browser(
          "eval",
          "[...document.querySelectorAll('input[name=active-provider]')].every(input=>input.disabled)",
        ),
      ).toBe(true);
      expect(await browser("eval", "document.querySelector('[data-field=provider-key-openrouter]').disabled")).toBe(
        true,
      );
      await browser("eval", "window.__resolveHealth()");
      await browser(
        "wait",
        "--fn",
        "(async()=> (await chrome.storage.local.get(null)).jevRequestLog?.entries.length===1)()",
      );
      expect(
        await browser("eval", "(async()=> (await chrome.storage.local.get(null)).jevRequestLog.entries[0].kind)()"),
      ).toBe("health-check");
      await click("Log");
      await browser(
        "wait",
        "--fn",
        "document.querySelector('section[aria-labelledby=jev-log-title]')?.textContent.includes('Health check')",
      );
      expect(
        await browser("eval", "document.querySelector('section[aria-labelledby=jev-log-title]').textContent"),
      ).toContain("Request succeeded");
      await click("Clear request log");
      await browser(
        "wait",
        "--fn",
        "document.querySelector('section[aria-labelledby=jev-log-title]')?.textContent.includes('No Jev requests yet.')",
      );
      expect(
        await browser("eval", "(async()=> (await chrome.storage.local.get(null)).activityData.events.length)()"),
      ).toBe(1);
      await click("API Keys");
      await browser("eval", "window.__failHealth=true");
      await click("Run health check");
      await browser("wait", '.astryx-banner-frame[role="alert"]');
      expect(await browser("eval", "document.querySelector('.astryx-banner-frame[role=alert]').textContent")).toContain(
        "OpenRouter",
      );
      expect(await browser("eval", "document.querySelector('[data-field=provider-key-openrouter]').disabled")).toBe(
        false,
      );
      expect(await browser("eval", "(async()=> 'providerSecrets' in await chrome.storage.local.get(null))()")).toBe(
        false,
      );
    } finally {
      await browser("close");
    }
  },
  60_000,
);
