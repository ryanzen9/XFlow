import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StatusMessage } from "./DashboardUI";

test("successful feedback does not insert a banner into the form layout", () => {
  expect(renderToStaticMarkup(<StatusMessage message="Saved" />)).toBe("");
});

test("actionable errors remain visible in context as an alert", () => {
  const markup = renderToStaticMarkup(<StatusMessage message="Could not save settings" error />);
  expect(markup).toContain('role="alert"');
  expect(markup).toContain("Could not save settings");
});
