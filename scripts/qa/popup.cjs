// Run with playwright-cli run-code --filename scripts/qa/popup.cjs
// oxlint-disable-next-line no-unused-vars -- Playwright CLI evaluates this function expression.
async function run(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };

  await page.goto("http://127.0.0.1:44137/popup.html");
  await page.evaluate(() => {
    localStorage.setItem(
      "xflow-dashboard-preview",
      JSON.stringify({
        activeProvider: "vercel-ai-gateway",
        providerSecrets: { openrouter: "", "vercel-ai-gateway": "gateway-1234", typesafe: "" },
        enabled: true,
        commentsEnabled: true,
        theme: "light",
      }),
    );
  });
  await page.reload();
  await page.setViewportSize({ width: 320, height: 560 });
  await page.getByText("Vercel AI Gateway", { exact: true }).waitFor();
  assert((await page.getByText("已配置", { exact: true }).count()) === 1, "Popup did not show provider status");
  assert((await page.locator('input[type="password"]').count()) === 0, "Popup still renders an API Key field");
  assert(await page.getByRole("switch", { name: "启用时间线分析" }).isChecked(), "Timeline switch changed");
  assert(await page.getByRole("switch", { name: "启用评论区分析" }).isChecked(), "Comment switch changed");
  assert(
    (await page.getByText("Filtered today", { exact: true }).count()) === 1,
    "Popup did not lead with the filtered-today readout",
  );
  assert((await page.getByText("Timeline signal filter").count()) === 0, "Popup still renders the brand lockup");
  assert(
    (await page.getByText("为时间线与评论区附上一层安静的内容信号，快速识别推广与垃圾信息。").count()) === 0,
    "Popup still renders the positioning copy",
  );
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "Popup has horizontal overflow",
  );
  assert(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
  return {
    result: "PASS",
    checks: ["provider status", "no key field", "switch state", "focal readout", "no brand copy", "layout"],
    errors,
  };
}
