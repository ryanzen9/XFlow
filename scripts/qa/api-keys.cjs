// Run with playwright-cli run-code --filename scripts/qa/api-keys.cjs
// oxlint-disable-next-line no-unused-vars -- Playwright CLI evaluates this function expression.
async function run(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const settle = () => page.waitForTimeout(350);

  const previewOrigin = await page.evaluate(() => location.origin);
  await page.goto(`${previewOrigin}/`);
  await page.evaluate(() => localStorage.removeItem("xfilter-dashboard-preview"));
  await page.reload();
  await page.getByRole("button", { name: "API Keys" }).click();

  assert((await page.getByRole("radio").count()) === 3, "Provider selector does not expose three channels");
  assert(await page.getByRole("radio", { name: /OpenRouter/ }).isChecked(), "OpenRouter is not the upgrade default");

  await page.locator("#provider-key-openrouter").fill("sk-or-browser-1234");
  await page.getByRole("button", { name: "保存 API Key" }).first().click();
  await settle();
  const openRouterCard = page.locator("section").filter({ has: page.getByRole("heading", { name: "OpenRouter" }) });
  assert((await openRouterCard.textContent()).includes("•••• 1234"), "Saved OpenRouter key hint is missing");
  assert(!(await openRouterCard.textContent()).includes("sk-or-browser"), "Full OpenRouter key was rendered");

  await page.getByRole("radio", { name: /TypeSafe/ }).check();
  await settle();
  await page.locator("#provider-key-typesafe").fill("ts-browser-9876");
  await page.getByRole("button", { name: "保存 API Key" }).last().click();
  await settle();
  assert(await page.getByRole("radio", { name: /TypeSafe/ }).isChecked(), "Active provider selection did not persist");

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("xfilter-dashboard-preview") || "{}"));
  assert(stored.activeProvider === "typesafe", "Active provider was not written to application settings");
  assert(stored.providerSecrets.openrouter === "sk-or-browser-1234", "OpenRouter secret was not stored separately");
  assert(stored.providerSecrets.typesafe === "ts-browser-9876", "TypeSafe secret was not stored separately");

  await page.getByRole("button", { name: "数据 Data" }).click();
  const configJson = await page.locator("#config-json").inputValue();
  assert(configJson.includes('"activeProvider": "typesafe"'), "Config JSON is missing activeProvider");
  assert(
    !configJson.includes("browser-1234") && !configJson.includes("browser-9876"),
    "Config JSON leaked a provider key",
  );
  assert(!configJson.includes("providerSecrets"), "Config JSON exposed the secret storage record");

  await page.getByRole("button", { name: "API Keys" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await settle();
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "API Keys page has horizontal overflow at 390px",
  );
  await page.setViewportSize({ width: 1440, height: 1080 });
  assert(errors.length === 0, `Browser errors: ${errors.join("; ")}`);

  return {
    result: "PASS",
    checks: [
      "three provider selector",
      "masked credential status",
      "active provider persistence",
      "separate secret storage",
      "config JSON secret exclusion",
      "mobile layout",
    ],
    errors,
  };
}
