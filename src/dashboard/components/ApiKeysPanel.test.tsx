import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { normalizeSettings } from "../../shared";
import { privacyPolicyUrl } from "../../ui/privacy";
import { ApiKeysPanel } from "./ApiKeysPanel";

test("renders API providers as a master-detail layout", () => {
  const settings = normalizeSettings({ activeProvider: "typesafe" });
  const markup = renderToStaticMarkup(
    <ApiKeysPanel settings={settings} busy={false} onProviderChange={async () => true} onStatus={() => {}} />,
  );

  expect(markup.match(/name="active-provider"/g)).toHaveLength(3);
  expect(markup).toContain('id="provider-detail-title-typesafe"');
  expect(markup).toContain('data-field="provider-key-typesafe"');
  expect(markup).not.toContain('data-field="provider-key-openrouter"');
  expect(markup).not.toContain('data-field="provider-key-vercel-ai-gateway"');
  expect(markup.indexOf("可见帖子的 ID 和正文")).toBeLessThan(markup.indexOf('data-field="provider-key-typesafe"'));
  expect(markup).toContain("运行健康检查");
  expect(markup).toContain(`href="${privacyPolicyUrl("zh-CN")}"`);
});

test("keeps provider credentials masked and ties the label to Astryx's input ID", () => {
  const markup = renderToStaticMarkup(
    <ApiKeysPanel
      settings={normalizeSettings({})}
      busy={true}
      onProviderChange={async () => true}
      onStatus={() => {}}
    />,
  );
  const input = markup.match(/<input[^>]*data-field="provider-key-openrouter"[^>]*>/)?.[0] ?? "";
  const inputId = input.match(/id="([^"]+)"/)?.[1];
  expect(inputId).toBeDefined();
  expect(markup).toContain(`for="${inputId}"`);
  expect(input).toContain('type="password"');
  expect(input).toContain('disabled=""');
  expect(markup).toContain("密钥仅存本机");
});
