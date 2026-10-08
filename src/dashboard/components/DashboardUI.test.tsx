import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StatusError, StatusMessage, StatusToast } from "./DashboardUI";

test("successful feedback does not insert a banner into the form layout", () => {
  expect(renderToStaticMarkup(<StatusMessage message="Saved" />)).toBe("");
});

test("actionable errors remain visible in context as an alert", () => {
  const markup = renderToStaticMarkup(<StatusMessage message="Could not save settings" error />);
  expect(markup).toContain('role="alert"');
  expect(markup).toContain("Could not save settings");
});

test("page errors and global success notifications can render independently", () => {
  expect(renderToStaticMarkup(<StatusToast message="Saved" />)).toBe("");
  expect(renderToStaticMarkup(<StatusError message="Saved" />)).toBe("");
  expect(renderToStaticMarkup(<StatusError message="Could not save settings" error />)).toContain('role="alert"');
});
