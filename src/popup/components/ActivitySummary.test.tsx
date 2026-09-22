import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ActivitySummary } from "./ActivitySummary";

describe("ActivitySummary", () => {
  test("keeps today as the primary metric and all-time as secondary context", () => {
    const markup = renderToStaticMarkup(<ActivitySummary today={128} allTime={8421} />);
    expect(markup).toContain("Filtered today");
    expect(markup).toContain(">128<");
    expect(markup).toContain("All time");
    expect(markup).toContain("8,421");
    expect(markup).toContain("filtered in total");
    expect(markup.indexOf(">128<")).toBeLessThan(markup.indexOf("8,421"));
    expect(markup).toContain("text-readout");
  });

  test("renders the neutral zero state without engagement language", () => {
    const markup = renderToStaticMarkup(<ActivitySummary today={0} allTime={0} />);
    expect(markup).toContain("Filtered today");
    expect(markup).not.toContain("Start browsing");
    expect(markup).not.toContain("Nothing blocked");
  });

  test("marks a live monitor on at least one surface", () => {
    const idle = renderToStaticMarkup(<ActivitySummary today={0} allTime={0} />);
    const live = renderToStaticMarkup(<ActivitySummary today={1} allTime={1} live />);
    expect(idle).not.toContain("activity-live");
    expect(live).toContain("activity-live");
  });
});
