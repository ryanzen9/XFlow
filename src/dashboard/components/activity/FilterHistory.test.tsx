import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { localDayKey, type ActivityEvent } from "../../../shared";
import { FilterHistory } from "./FilterHistory";

test("renders every record on a busy day", () => {
  const now = new Date(2026, 8, 22, 12).getTime();
  const history: ActivityEvent[] = Array.from({ length: 51 }, (_, index) => ({
    id: `x:${index}`,
    contentId: String(index),
    day: localDayKey(now),
    filteredAt: now - index,
    updatedAt: now - index,
    deviceId: "device-a",
    surface: "timeline",
    status: "filtered",
    preview: `preview ${index}`,
  }));

  const markup = renderToStaticMarkup(
    <FilterHistory history={history} now={now} busy={false} onIncorrect={() => {}} />,
  );

  expect(markup).toContain("51 records");
  expect(markup).toContain("preview 50");
  expect(markup.match(/Not supposed to be filtered/g)).toHaveLength(51);
});
