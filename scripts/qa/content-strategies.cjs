// Uses the production content bundle with mocked extension messages; never calls the API.
// oxlint-disable-next-line no-unused-vars -- Playwright CLI evaluates this function expression.
async function run(page) {
  const origin = await page.evaluate(() => location.origin);
  const script = await (await page.request.get(`${origin}/content.js`)).text();
  const css = await (await page.request.get(`${origin}/content.css`)).text();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  await page.addInitScript(() => {
    if (location.hostname !== "x.com") return;
    const listeners = new Set();
    const strategy = (id, name, priority, sensitivity, surfaces) => ({
      id,
      name,
      priority,
      sensitivity,
      surfaces,
      enabled: true,
      prompt: "filter advertisements",
      hoverTemplate: "{{strategy.name}} · {{strategy.hitrate}}\n{{model.nickname}} / {{surface}}",
      hoverCss: ".label { color: rgb(10, 119, 118); }",
    });
    const settings = {
      enabled: true,
      commentsEnabled: true,
      modelNickname: "QA model",
      strategies: [
        strategy("strict-home", "Strict Home", 1, 30, ["timeline"]),
        strategy("fallback-home", "Fallback Home", 2, 60, ["timeline"]),
        strategy("comments", "Comment rule", 3, 70, ["comments"]),
      ],
    };
    globalThis.qa = {
      settings,
      requests: [],
      patch(patch) {
        const changes = Object.fromEntries(
          Object.entries(patch).map(([key, value]) => [key, { oldValue: settings[key], newValue: value }]),
        );
        Object.assign(settings, patch);
        listeners.forEach((listener) => listener(changes, "local"));
      },
    };
    globalThis.chrome = {
      storage: { onChanged: { addListener: (fn) => listeners.add(fn), removeListener: (fn) => listeners.delete(fn) } },
      runtime: {
        sendMessage: async (message) => {
          if (message.type === "GET_STATUS")
            return { ok: true, configured: true, enabled: settings.enabled, commentsEnabled: settings.commentsEnabled };
          qa.requests.push(message);
          const applicable = settings.strategies
            .filter((strategy) => strategy.enabled && strategy.surfaces.includes(message.surface))
            .sort((a, b) => a.priority - b.priority);
          const selected = applicable.find((strategy) => 0.65 >= (100 - strategy.sensitivity) / 100);
          return {
            ok: true,
            results: selected
              ? message.posts.map((post) => ({
                  id: post.id,
                  probability: 0.65,
                  details: { strategy: selected, modelNickname: settings.modelNickname, surface: message.surface },
                }))
              : [],
          };
        },
      },
    };
  });
  const article = (id) =>
    `<article id="post-${id}" data-testid="tweet"><div><a href="https://x.com/example/status/${id}"><time>Today</time></a><p data-testid="tweetText">Example ${id}: promotional sample text.</p><button>Reply</button></div></article>`;
  await page.route("https://x.com/**", (route) => {
    if (route.request().url().endsWith("/qa-content.js"))
      return route.fulfill({ contentType: "text/javascript; charset=utf-8", body: script });
    return route.fulfill({
      contentType: "text/html; charset=utf-8",
      body: `<!doctype html><html><head><meta charset="utf-8"><style>body{background:white;color:#102c33;font-family:Arial;margin:20px}article{width:560px;min-height:160px;border:1px solid #ccc;padding:20px;margin-bottom:20px}${css}</style></head><body>${article("100")}${article("200")}<script src="/qa-content.js"></script></body></html>`,
    });
  });
  await page.goto("https://x.com/home");
  await page.waitForFunction(() => document.querySelectorAll('article[data-xflow-state="obscured"]').length === 2);
  await page.locator("#post-100 .xflow-veil").hover();
  await page.waitForTimeout(180);
  assert(
    (await page.locator("#post-100 .xflow-veil__label-rate").textContent()).includes("Fallback Home · 65%"),
    "Content did not fall through to lower priority",
  );
  assert(
    (await page.locator("#post-100 .xflow-veil__label-rate").evaluate((el) => getComputedStyle(el).color)) ===
      "rgb(10, 119, 118)",
    "Content custom CSS failed",
  );
  await page.evaluate(() =>
    qa.patch({
      strategies: qa.settings.strategies.map((strategy) =>
        strategy.id === "strict-home" ? { ...strategy, sensitivity: 50 } : strategy,
      ),
    }),
  );
  assert(
    (await page.locator("#post-100").getAttribute("data-xflow-state")) === "revealing",
    "Policy update skipped revealing transition",
  );
  await page.waitForFunction(() =>
    document.querySelector("#post-100 .xflow-veil__label-rate")?.textContent.includes("Strict Home"),
  );
  await page.evaluate(() => qa.patch({ enabled: false }));
  assert(
    (await page.locator("#post-100").getAttribute("data-xflow-state")) === "revealing",
    "Disable skipped revealing transition",
  );
  await page.waitForFunction(() => !document.querySelector(".xflow-veil"));
  await page.evaluate(() => qa.patch({ enabled: true }));
  await page.waitForFunction(() => document.querySelectorAll('article[data-xflow-state="obscured"]').length === 2);
  await page.goto("https://x.com/example/status/100");
  await page.waitForFunction(() => document.querySelector("#post-200")?.dataset.xflowState === "obscured");
  assert((await page.locator("#post-100 .xflow-veil").count()) === 0, "Root post incorrectly filtered as comment");
  assert(
    await page.evaluate(() =>
      qa.requests.every(
        (request) => request.surface === "comments" && request.posts.every((post) => post.id !== "100"),
      ),
    ),
    "Root post sent for comment review",
  );
  await page.evaluate(() => qa.patch({ enabled: false }));
  assert(
    (await page.locator("#post-200").getAttribute("data-xflow-state")) === "obscured",
    "Timeline switch affected comments",
  );
  await page.locator("#post-200 .xflow-veil").hover();
  await page.waitForTimeout(180);
  assert(
    (await page.locator("#post-200 .xflow-veil__label-rate").textContent()).includes("Comment rule"),
    "Wrong strategy in comments",
  );
  await page.evaluate(() => qa.patch({ commentsEnabled: false }));
  assert(
    (await page.locator("#post-200").getAttribute("data-xflow-state")) === "revealing",
    "Comments disable skipped animation",
  );
  await page.waitForFunction(() => !document.querySelector(".xflow-veil"));
  assert(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
  return {
    result: "PASS",
    checks: [
      "priority fallback",
      "priority winner update",
      "metadata and CSS",
      "animated toggles",
      "comment root exclusion",
      "independent switches",
    ],
    errors,
  };
}
