import { describe, expect, test } from "bun:test";
import { cn } from "./cn";

describe("cn", () => {
  test("keeps a type role and a text colour independent", () => {
    expect(cn("text-meta", "text-muted")).toBe("text-meta text-muted");
    expect(cn("text-ui", "text-ink")).toBe("text-ui text-ink");
    expect(cn("font-mono text-caption text-muted", "uppercase")).toBe("font-mono text-caption text-muted uppercase");
  });

  test("still lets a later colour or role win", () => {
    expect(cn("text-ui", "text-warn")).toBe("text-ui text-warn");
    expect(cn("text-live", "text-faint")).toBe("text-faint");
    expect(cn("text-caption", "text-readout")).toBe("text-readout");
    expect(cn("text-xs", "text-sm")).toBe("text-sm");
  });
});
