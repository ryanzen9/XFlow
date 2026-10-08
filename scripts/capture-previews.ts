import { mkdir, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { defaultStrategy, localDayKey, normalizeSettings, type ActivityEvent } from "../src/shared";
import { version } from "../package.json";

const root = resolve(import.meta.dir, "..");
const output = resolve(root, "output", "previews", version);
const port = Number(Bun.env.PREVIEW_ASSETS_PORT || 43998);
const origin = `http://127.0.0.1:${port}`;
const now = Date.now();
const date = new Date(now);
const sourceCommit = (await run(["git", "-c", "core.fsmonitor=false", "rev-parse", "HEAD"])).trim();
const mergedMain = (await run(["git", "-c", "core.fsmonitor=false", "rev-parse", "origin/main"])).trim();
const assets: { file: string; locale: string; theme: string; width: number; height: number; sha256: string }[] = [];
const strategies = [
  {
    ...defaultStrategy("timeline", 1, "preview-ads"),
    name: "Ads and promotions",
    hoverTemplate: "{{strategy.name}} · {{strategy.hitrate}}\n{{model.nickname}} · Threshold {{strategy.threshold}}",
    prompt:
      "Filter advertisements, affiliate promotions and repeated sales pitches. Keep useful recommendations and personal experiences.",
  },
  {
    ...defaultStrategy("timeline", 2, "preview-spam"),
    name: "Spam and engagement bait",
    prompt: "Filter repetitive spam and posts that ask for engagement without sharing useful information.",
  },
  {
    ...defaultStrategy("timeline", 3, "preview-noise"),
    name: "Low-value noise",
    prompt: "Filter empty claims and irrelevant promotional replies.",
    enabled: false,
  },
  {
    ...defaultStrategy("comments", 1, "preview-replies"),
    name: "Reply spam",
    prompt: "Filter unsolicited promotions and repetitive replies.",
  },
];
const events: ActivityEvent[] = [];
for (let day = 0; day < 84; day++) {
  const dayDate = new Date(date);
  dayDate.setDate(date.getDate() - day);
  dayDate.setHours(day === 0 ? Math.max(0, date.getHours() - 1) : 10, 0, 0, 0);
  const count = day === 0 ? 14 : day % 9 === 0 ? 0 : 3 + ((day * 7) % 16);
  for (let index = 0; index < count; index++) {
    const time = dayDate.getTime() + index * 1000;
    events.push({
      id: `sample-${day}-${index}`,
      contentId: `sample-${day}-${index}`,
      deviceId: "preview-device",
      day: localDayKey(time),
      filteredAt: time,
      updatedAt: time,
      surface: index % 4 === 0 ? "comments" : "timeline",
      status: index % 13 === 0 ? "incorrect" : index % 7 === 0 ? "revealed" : "filtered",
      author: "Sample author",
      preview: "Sample promotional post used to demonstrate filtering activity.",
      policyName: index % 4 === 0 ? "Reply spam" : "Ads and promotions",
    });
  }
}
const fixture = {
  ...normalizeSettings({ theme: "dark", enabled: true, commentsEnabled: true, strategies }),
  "xflow.uiLocale": "en",
  activityData: {
    schemaVersion: 1,
    clearedAt: 0,
    historyClearedAt: 0,
    archivedByDevice: { "preview-device": 1200 },
    events,
  },
  jevRequestLog: {
    schemaVersion: 1,
    entries: [
      {
        id: "sample-review",
        kind: "review",
        requestedAt: now - 60_000,
        durationMs: 186,
        providerId: "openrouter",
        modelId: "typesafe/jev-1.13",
        status: "success",
        itemCount: 8,
        questionCount: 2,
        surface: "timeline",
      },
      {
        id: "sample-health",
        kind: "health-check",
        requestedAt: now - 120_000,
        durationMs: 42,
        providerId: "typesafe",
        modelId: "jev-latest",
        status: "success",
        itemCount: 1,
        questionCount: 1,
      },
    ],
  },
};

async function run(args: string[], cwd = root) {
  const proc = Bun.spawn(args, { cwd, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) throw new Error(`${args.slice(0, 7).join(" ")}: ${stderr || stdout}`);
  return stdout;
}

async function record(file: string, locale: string, theme: string) {
  const bytes = new Uint8Array(await Bun.file(resolve(root, file)).arrayBuffer());
  let width: number, height: number;
  if (file.endsWith(".png")) {
    const view = new DataView(bytes.buffer);
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else {
    // cwebp emits VP8X/VP8L depending on transparency; inspect the container with webpinfo.
    const info = await run(["webpinfo", resolve(root, file)]);
    width = Number(info.match(/Width:\s+(\d+)/)?.[1]);
    height = Number(info.match(/Height:\s+(\d+)/)?.[1]);
  }
  if (!width! || !height!) throw new Error(`Missing dimensions: ${file}`);
  const sha256 = new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
  assets.push({ file, locale, theme, width: width!, height: height!, sha256 });
}

async function capture(
  name: string,
  locale: string,
  theme: "light" | "dark",
  width: number,
  height: number,
  page: string,
  prepare?: (browser: (...args: string[]) => Promise<unknown>) => Promise<void>,
  selector?: string,
) {
  const session = `xflow-preview-${process.pid}-${name}`;
  const state = resolve(tmpdir(), `${session}.json`);
  const png = resolve(output, `${name}.png`);
  await Bun.write(
    state,
    JSON.stringify({
      cookies: [],
      origins: [
        {
          origin,
          localStorage: [
            { name: "xflow-dashboard-preview", value: JSON.stringify({ ...fixture, theme, "xflow.uiLocale": locale }) },
          ],
        },
      ],
    }),
  );
  const browser = async (...args: string[]) => {
    const raw = await run(["agent-browser", "--session", session, "--json", ...args]);
    const result = JSON.parse(raw);
    if (!result.success) throw new Error(JSON.stringify(result.error));
    return result.data?.result;
  };
  try {
    await browser("--state", state, "open", `${origin}${page}`);
    await browser("set", "media", theme, "reduced-motion");
    await browser("set", "viewport", String(width), String(height));
    await browser("wait", "--fn", "document.fonts.status==='loaded'");
    if (prepare) await prepare(browser);
    await browser("eval", "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
    if (selector) {
      await browser("eval", `document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:'center'})`);
      await browser("eval", "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
    }
    await browser("snapshot", "-i", "-d", "2");
    await browser("screenshot", ...(selector ? [selector] : []), png);
    await record(`output/previews/${version}/${name}.png`, locale, theme);
    console.log(`Captured ${name}`);
    return png;
  } finally {
    await browser("close");
    await Bun.file(state).delete();
  }
}
const click = (browser: (...args: string[]) => Promise<unknown>, name: string) =>
  browser("find", "role", "button", "click", "--name", name, "--exact");
const editor = async (browser: (...args: string[]) => Promise<unknown>) => {
  await click(browser, "Strategies");
  await click(browser, "Edit strategy Ads and promotions");
  await browser("find", "role", "combobox", "click", "--name", "Preview theme", "--exact");
  await browser("find", "role", "option", "click", "--name", "Dark", "--exact");
  await browser(
    "wait",
    "--fn",
    "Boolean(document.querySelector('article[data-preview-theme=dark][data-xflow-state=obscured] .xflow-veil-host button'))",
  );
};

await mkdir(output, { recursive: true });
const server = Bun.spawn(["bun", "run", "scripts/preview-dashboard.ts"], {
  cwd: root,
  env: { ...Bun.env, DASHBOARD_PREVIEW_PORT: String(port) },
  stdout: "ignore",
  stderr: "inherit",
});
try {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (server.exitCode !== null) throw new Error("Preview server exited before capture.");
    const response = await fetch(`${origin}/popup.html`).catch(() => null);
    if (response?.ok) break;
    if (attempt === 49) throw new Error("Preview server did not start.");
    await Bun.sleep(100);
  }
  const docs = [
    ["strategy-editor", await capture("strategy-editor", "en", "dark", 1440, 1050, "/dashboard.html", editor)],
    [
      "dashboard-activity",
      await capture("dashboard-activity", "en", "dark", 1440, 1050, "/dashboard.html", async (browser) => {
        await browser("wait", ".astryx-table");
      }),
    ],
    [
      "veil-preview",
      await capture(
        "veil-preview",
        "en",
        "dark",
        1440,
        1050,
        "/dashboard.html",
        editor,
        'aside[aria-label="Strategy preview"]',
      ),
    ],
    ["popup-light", await capture("popup-light", "zh-CN", "light", 320, 400, "/popup.html")],
    ["popup-dark", await capture("popup-dark", "zh-CN", "dark", 320, 400, "/popup.html")],
    [
      "provider-settings",
      await capture("provider-settings", "en", "dark", 1440, 900, "/dashboard.html", async (browser) => {
        await click(browser, "API Keys");
      }),
    ],
    [
      "jev-request-log",
      await capture(
        "jev-request-log",
        "en",
        "dark",
        1440,
        1050,
        "/dashboard.html",
        async (browser) => {
          await click(browser, "Log");
          await browser("wait", "#jev-log-title");
        },
        'section[aria-labelledby="jev-log-title"]',
      ),
    ],
  ];
  for (const [name, png] of docs) {
    await run(["cwebp", "-q", "90", png!, "-o", resolve(root, `docs/assets/${name}.webp`)]);
    await record(
      `docs/assets/${name}.webp`,
      name!.startsWith("popup") ? "zh-CN" : "en",
      name === "popup-light" ? "light" : "dark",
    );
  }
  await capture("01-popup", "en", "dark", 1280, 800, "/__preview__/store-popup.html", async (browser) => {
    await browser(
      "wait",
      "--fn",
      "document.querySelector('iframe').contentDocument?.querySelector('#enabled [role=switch]')&&!document.querySelector('iframe').contentDocument.querySelector('#enabled [role=switch]').disabled",
    );
  });
  await capture("02-activity-dashboard", "en", "dark", 1280, 800, "/dashboard.html", async (browser) => {
    await browser("wait", ".astryx-table");
  });
  await capture("03-strategy-and-veil", "en", "dark", 1280, 800, "/dashboard.html", editor);
  const manifest = {
    version,
    capturedAt: new Date().toISOString(),
    sourceCommit,
    mergedMain,
    source: "Production dist UI served by scripts/preview-dashboard.ts",
    data: "Synthetic fixtures; no credentials or provider requests. Health/request results and veil decisions are local simulations.",
    assets,
  };
  await Bun.write(resolve(output, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  await mkdir(resolve(output, "store"), { recursive: true });
  for (const file of ["01-popup.png", "02-activity-dashboard.png", "03-strategy-and-veil.png", "manifest.json"])
    await copyFile(resolve(output, file), resolve(output, "store", file));
  await copyFile(resolve(root, "icons/icon-128.png"), resolve(output, "store/store-icon-128.png"));
  await copyFile(
    resolve(root, "docs/assets/small-promo-440x280.png"),
    resolve(output, "store/small-promo-440x280.png"),
  );
  await Bun.write(
    resolve(output, "store/README.md"),
    `# XFlow ${version} preview artwork\n\nCaptured from ${sourceCommit}, main ${mergedMain}.\n\nUpload the three numbered PNGs in order: Popup, filtering overview, strategy editor/local veil preview. All are English UI, dark theme, 1280 × 800. Sample data only; no real provider calls. The Popup presentation frame contains the real 320 × 400 Popup. Icon: 128 × 128; small promo: 440 × 280.\n\nSee manifest.json for capture timestamps, dimensions, and SHA-256. These artwork files do not certify an extension ZIP or a published Store release.\n`,
  );
  await Bun.file(resolve(output, `xflow-${version}-store-previews.zip`))
    .delete()
    .catch(() => {});
  await run(["zip", "-q", "-r", `../xflow-${version}-store-previews.zip`, "."], resolve(output, "store"));
  console.log(`Preview inventory: ${resolve(output, "manifest.json")}`);
  console.log(`Store artwork: ${resolve(output, `xflow-${version}-store-previews.zip`)}`);
} finally {
  server.kill();
  await server.exited;
}
