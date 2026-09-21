// Run with playwright-cli run-code --filename scripts/qa/data.cjs
// oxlint-disable-next-line no-unused-vars -- Playwright CLI evaluates this function expression.
async function run(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  let remote = null;
  const requests = [];
  await page.route("https://s3.example.com/**", async (route) => {
    const request = route.request();
    requests.push({
      method: request.method(),
      url: request.url(),
      headers: request.headers(),
      body: request.postData(),
    });
    if (request.method() === "GET") {
      if (!remote) return route.fulfill({ status: 404, body: "missing" });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(remote) });
    }
    remote = JSON.parse(request.postData());
    return route.fulfill({ status: 200, body: "" });
  });

  await page.evaluate(() => localStorage.removeItem("xfilter-dashboard-preview"));
  await page.reload();
  await page.getByRole("button", { name: "数据 Data" }).click();
  const editor = page.locator("#config-json");
  await editor.waitFor();
  let config = JSON.parse(await editor.inputValue());
  assert(Array.isArray(config.strategies), "Strategies are missing from editable config");
  assert(
    !("configVersion" in config) && !("schemaVersion" in config) && !("updatedAt" in config),
    "Internal metadata leaked into the editor",
  );
  assert((await page.locator(".version-ledger").count()) === 0, "Visible version comparison panel still exists");
  assert(
    (await page.getByRole("button", { name: "比较版本并同步" }).count()) === 0,
    "Manual compare action still exists",
  );

  config.modelNickname = "JSON edited model";
  config.configVersion = 999;
  await editor.fill(JSON.stringify(config, null, 2));
  await page.getByRole("button", { name: "应用到浏览器存储" }).click();
  await page.getByText(/配置已写入浏览器/).waitFor();
  config = JSON.parse(await editor.inputValue());
  let stored = await page.evaluate(() => JSON.parse(localStorage.getItem("xfilter-dashboard-preview")));
  assert(config.modelNickname === "JSON edited model", "JSON edit did not persist");
  assert(!("configVersion" in config), "User-supplied version was not stripped from editable config");
  assert(stored.configVersion === 1, "Hidden version did not start at one");
  await page.getByRole("button", { name: "应用到浏览器存储" }).click();
  await page.getByText(/配置已写入浏览器/).waitFor();
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem("xfilter-dashboard-preview")));
  assert(stored.configVersion === 2, "Hidden version did not increment after the second write");

  await editor.fill("{ invalid json");
  await page.getByRole("button", { name: "格式化 JSON" }).click();
  await page.getByRole("alert").waitFor();
  config = { ...config };
  delete config.configVersion;
  await editor.fill(JSON.stringify(config, null, 2));

  await page.locator("#s3-endpoint").fill("https://s3.example.com");
  await page.locator("#s3-region").fill("us-east-1");
  await page.locator("#s3-bucket").fill("private-config");
  await page.locator("#s3-object-key").fill("xfilter/config.json");
  await page.locator("#s3-access-key").fill("access-id");
  await page.locator("#s3-secret-key").fill("top-secret");
  remote = { schemaVersion: 1, configVersion: 1, updatedAt: "2026-09-21T01:00:00.000Z", config };
  await page.getByRole("button", { name: "保存并启用自动同步" }).click();
  await page.getByText(/S3 自动同步已启用/).waitFor();
  assert(
    requests.map((request) => request.method).join(",") === "GET,PUT",
    `Initial automatic sync did not compare and push newer local config: ${requests
      .map((request) => request.method)
      .join(",")}`,
  );
  assert(requests[1].headers.authorization.startsWith("AWS4-HMAC-SHA256"), "S3 request was not signed");
  assert(!requests[1].body.includes("top-secret"), "S3 credentials leaked into remote document");
  assert(remote.config.modelNickname === "JSON edited model", "Pushed configuration is stale");
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem("xfilter-dashboard-preview")));
  assert(stored.s3Sync.autoSyncEnabled === true, "Automatic sync preference was not persisted");

  remote = {
    ...remote,
    configVersion: 9,
    updatedAt: "2026-09-21T09:00:00.000Z",
    config: { ...remote.config, modelNickname: "Remote model" },
  };
  await page.getByRole("button", { name: "通用 General" }).click();
  await page.getByRole("button", { name: "数据 Data" }).click();
  await page.waitForFunction(
    () => JSON.parse(document.querySelector("#config-json").value).modelNickname === "Remote model",
  );
  const pulled = JSON.parse(await editor.inputValue());
  assert(
    pulled.modelNickname === "Remote model" && !("configVersion" in pulled),
    "Automatic remote pull leaked its envelope into the editor",
  );
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem("xfilter-dashboard-preview")));
  assert(
    stored.configVersion === 9 && stored.modelNickname === "Remote model",
    "Automatic remote pull was not persisted locally",
  );
  assert(stored.s3Sync.secretAccessKey === "top-secret", "Remote pull removed local S3 credentials");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "Data page overflows on mobile",
  );
  await page.setViewportSize({ width: 1440, height: 1080 });
  assert(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
  return {
    result: "PASS",
    checks: [
      "config-only editor",
      "hidden version ownership",
      "invalid JSON",
      "automatic signed S3 push",
      "credential isolation",
      "automatic newer remote pull",
      "local credential preservation",
      "mobile layout",
    ],
    requests: requests.map(({ method, url }) => ({ method, url })),
    errors,
  };
}
