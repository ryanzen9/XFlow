import { describe, expect, test } from "bun:test";

const stylesheet = await Bun.file(new URL("./content.css", import.meta.url)).text();

describe("blur veil state selectors", () => {
  test("uses extension-owned data state instead of X-owned article classes", () => {
    expect(stylesheet).toContain('article[data-xfilter-state="obscured"]');
    expect(stylesheet).toContain('article[data-xfilter-state="revealing"]');
    expect(stylesheet).not.toContain("article.xfilter-post");
  });

  test("keeps blur active independently from hover feedback", () => {
    expect(stylesheet).toContain('article[data-xfilter-state="obscured"] > :not(.xfilter-veil-host)');
    expect(stylesheet).toContain("filter: blur(12px) contrast(0.7) saturate(0.8);");
  });

  test("crossfades the rate label only for hover or keyboard focus", () => {
    expect(stylesheet).toContain(".xfilter-veil__label-rate");
    expect(stylesheet).toContain(".xfilter-veil:is(:hover, :focus-visible) .xfilter-veil__label-rate");
  });
});
