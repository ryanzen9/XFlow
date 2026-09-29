import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FoundationPreview } from "./astryx-foundation";

test("the Astryx foundation preview renders labeled native controls", () => {
  const markup = renderToStaticMarkup(<FoundationPreview />);

  expect(markup).toContain('class="astryx-button');
  expect(markup).toContain('class="astryx-text-input');
  expect(markup).toContain("Preview value");
  expect(markup).toContain("Apply value");
  expect(markup).toContain("Switch to dark mode");
  expect(markup).toContain("<input");
  expect(markup).toContain("<button");
});
