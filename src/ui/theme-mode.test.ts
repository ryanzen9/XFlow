import { expect, test } from "bun:test";
import { getThemeMode, setThemeMode, subscribeThemeMode } from "./theme-mode";

test("theme mode changes notify the Astryx root once and preserve the selected mode", () => {
  const initial = getThemeMode();
  const observed: string[] = [];
  const unsubscribe = subscribeThemeMode(() => observed.push(getThemeMode()));

  try {
    setThemeMode("dark");
    setThemeMode("dark");
    setThemeMode("light");
    expect(observed).toEqual(initial === "dark" ? ["light"] : ["dark", "light"]);

    unsubscribe();
    setThemeMode("dark");
    expect(observed.at(-1)).toBe("light");
  } finally {
    unsubscribe();
    setThemeMode(initial);
  }
});
