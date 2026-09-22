import { describe, expect, test } from "bun:test";

const stylesheet = await Bun.file(new URL("./content.css", import.meta.url)).text();

describe("blur veil state selectors", () => {
  test("uses extension-owned data state instead of X-owned article classes", () => {
    expect(stylesheet).toContain('article[data-xflow-state="obscured"]');
    expect(stylesheet).toContain('article[data-xflow-state="revealing"]');
    expect(stylesheet).not.toContain("article.xflow-post");
  });

  test("keeps blur active independently from hover feedback", () => {
    expect(stylesheet).toContain('article[data-xflow-state="obscured"] > :not(.xflow-veil-host)');
    expect(stylesheet).toContain("filter: blur(12px) contrast(0.7) saturate(0.8);");
  });

  test("crossfades the rate label only for hover or keyboard focus", () => {
    expect(stylesheet).toContain(".xflow-veil__label-rate");
    expect(stylesheet).toContain(".xflow-veil:is(:hover, :focus-visible) .xflow-veil__label-rate");
  });
});
