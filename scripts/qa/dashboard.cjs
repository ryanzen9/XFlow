// Run with playwright-cli run-code --filename scripts/qa/dashboard.cjs
// oxlint-disable-next-line no-unused-vars -- Playwright CLI evaluates this function expression.
async function run(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const settle = () => page.waitForTimeout(500);
  const goStrategies = () => page.getByRole("button", { name: "策略 Strategies" }).click();
  const back = () => page.getByRole("button", { name: /← 返回.+表格/ }).click();
  const row = (name) => page.locator(".strategy-table tbody tr").filter({ hasText: name });
  const timelineTab = () => page.getByRole("tab", { name: /时间线博文/ });
  const commentsTab = () => page.getByRole("tab", { name: /评论区/ });

  await page.evaluate(() => localStorage.removeItem("xflow-dashboard-preview"));
  await page.reload();
  await page.locator("#model-nickname").fill("Quiet reader");
  await page.getByRole("switch", { name: "评论区", exact: true }).check();
  await page.getByRole("button", { name: "保存通用设置" }).click();
  await goStrategies();
  assert((await page.getByRole("tab").count()) === 2, "Two surface tabs are not present");
  assert((await timelineTab().getAttribute("aria-selected")) === "true", "Timeline tab is not selected by default");
  assert(
    (await page.locator(".strategy-table tbody tr").count()) === 1,
    "Timeline table did not isolate its legacy strategy",
  );
  assert(
    (await row("Home 内容净化").locator(".table-priority").textContent()) === "P1",
    "Timeline priority should start at P1",
  );
  await commentsTab().click();
  assert(
    (await page.locator(".strategy-table tbody tr").count()) === 1,
    "Comment table did not isolate its legacy strategy",
  );
  assert(
    (await row("评论区内容净化").locator(".table-priority").textContent()) === "P1",
    "Comment priority should independently start at P1",
  );
  await timelineTab().click();

  await page.getByRole("button", { name: "编辑策略 Home 内容净化" }).click();
  assert(
    (await page.locator(".strategy-surface").textContent()).includes("时间线博文"),
    "Detail page lost its owning table",
  );
  await page.locator("#strategy-name").fill("Home 精选");
  await page.locator("#strategy-prompt").fill("过滤广告和抽奖，保留技术分享。");
  await page.locator("#hover-css").fill(".label { color: rgb(10, 119, 118); font-weight: 600; }");
  await page.getByRole("button", { name: "保存策略" }).click();
  await settle();
  await page.locator(".xflow-veil").hover();
  await settle();
  const hover = await page.locator(".xflow-veil__label-rate").evaluate((el) => ({
    text: el.textContent,
    color: getComputedStyle(el).color,
    opacity: getComputedStyle(el).opacity,
  }));
  assert(
    hover.text.includes("Home 精选") && hover.text.includes("Quiet reader") && hover.text.includes("86%"),
    "Hover variables missing",
  );
  assert(hover.color === "rgb(10, 119, 118)" && hover.opacity === "1", "Hover CSS not applied");

  await back();
  await page.getByRole("button", { name: "新建时间线博文策略 ＋" }).click();
  await page.locator("#strategy-name").fill("抽奖与诱导互动");
  await page.locator("#strategy-prompt").fill("过滤抽奖、关注转发和诱导互动。");
  await page.locator("#strategy-priority").selectOption("1");
  await page.getByRole("button", { name: "保存策略" }).click();
  await back();
  assert(
    (await row("抽奖与诱导互动").locator(".table-priority").textContent()) === "P1",
    "Editor priority did not reorder timeline table",
  );
  assert(
    (await row("Home 精选").locator(".table-priority").textContent()) === "P2",
    "Timeline strategy was not reindexed",
  );
  await commentsTab().click();
  assert(
    (await row("评论区内容净化").locator(".table-priority").textContent()) === "P1",
    "Timeline reorder leaked into comment priority",
  );
  await row("评论区内容净化").getByRole("switch").uncheck();
  await page.getByRole("button", { name: "保存评论区策略" }).click();

  await page.reload();
  await page.locator("#model-nickname").waitFor();
  assert((await page.locator("#model-nickname").inputValue()) === "Quiet reader", "Nickname did not persist");
  await goStrategies();
  assert(
    (await row("抽奖与诱导互动").locator(".table-priority").textContent()) === "P1",
    "Timeline priority did not persist",
  );
  await timelineTab().focus();
  await timelineTab().press("ArrowRight");
  assert((await commentsTab().getAttribute("aria-selected")) === "true", "Tab keyboard navigation failed");
  assert(!(await row("评论区内容净化").getByRole("switch").isChecked()), "Comment strategy state did not persist");
  await timelineTab().click();

  await page.getByRole("button", { name: "编辑策略 Home 精选" }).click();
  await page.locator("#hover-css").fill("body { display: none; }");
  assert(await page.getByRole("button", { name: "保存策略" }).isDisabled(), "Invalid CSS can be saved");
  await page.locator("#hover-css").fill("");
  await page.getByRole("button", { name: "保存策略" }).click();
  await page.evaluate(() => {
    globalThis.qaStorageSet = chrome.storage.local.set;
    chrome.storage.local.set = async () => {
      throw new Error("simulated storage failure");
    };
  });
  await page.locator("#strategy-name").fill("失败时保留草稿");
  await page.getByRole("button", { name: "保存策略" }).click();
  await page.getByRole("alert").waitFor();
  assert((await page.locator("#strategy-name").inputValue()) === "失败时保留草稿", "Failed save discarded draft");
  await page.evaluate(() => {
    chrome.storage.local.set = globalThis.qaStorageSet;
  });
  await page.locator("#strategy-name").fill("Home 精选");
  await page.getByRole("button", { name: "保存策略" }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await settle();
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "Mobile editor horizontal overflow",
  );
  await back();
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "Mobile strategy table horizontal overflow",
  );
  await page.setViewportSize({ width: 1440, height: 1080 });
  assert(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
  return {
    result: "PASS",
    checks: [
      "two surface tabs",
      "independent tables and priorities",
      "detail navigation",
      "strategy creation",
      "persistence",
      "keyboard tabs",
      "hover preview",
      "invalid CSS",
      "storage failure",
      "mobile layout",
    ],
    errors,
  };
}
