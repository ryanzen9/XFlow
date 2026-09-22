import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { normalizeSettings } from "../../shared";
import { ApiKeysPanel } from "./ApiKeysPanel";

test("renders API providers as a master-detail layout", () => {
  const settings = normalizeSettings({ activeProvider: "typesafe" });
  const markup = renderToStaticMarkup(
    <ApiKeysPanel settings={settings} busy={false} onProviderChange={async () => true} onStatus={() => {}} />,
  );

  expect(markup.match(/name="active-provider"/g)).toHaveLength(3);
  expect(markup).toContain('id="provider-detail-title-typesafe"');
  expect(markup).toContain('id="provider-key-typesafe"');
  expect(markup).not.toContain('id="provider-key-openrouter"');
  expect(markup).not.toContain('id="provider-key-vercel-ai-gateway"');
});
