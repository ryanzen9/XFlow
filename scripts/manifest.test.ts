import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import {
  DEFAULT_LOCALE,
  ICON_SIZES,
  LOCALES,
  MINIMUM_CHROME_VERSION,
  compareLocaleCatalogs,
  createManifest,
  findForbiddenReleaseEntries,
  messageReferenceKeys,
  readLocaleCatalog,
  readPngDimensions,
  validateManifest,
  type ExtensionManifest,
} from "./manifest";

const defaultCatalog = await readLocaleCatalog(DEFAULT_LOCALE);
const productionManifest = createManifest();

describe("production manifest", () => {
  test("passes every release assertion", () => {
    expect(validateManifest(productionManifest, defaultCatalog)).toEqual([]);
  });

  test("declares only the permissions the shipped features use", () => {
    expect(productionManifest.permissions).toEqual(["storage", "alarms"]);
    expect(productionManifest.host_permissions).toEqual([
      "https://openrouter.ai/*",
      "https://ai-gateway.vercel.sh/*",
      "https://api.typesafe.ai/*",
    ]);
    expect(productionManifest.optional_host_permissions).toEqual(["https://*/*"]);
  });

  test("keeps development origins out of every field", () => {
    expect(findForbiddenReleaseEntries(productionManifest)).toEqual([]);
  });

  test("requires a Chrome version that supports the shipped runtime", () => {
    expect(productionManifest.minimum_chrome_version).toBe(MINIMUM_CHROME_VERSION);
    expect(Number(MINIMUM_CHROME_VERSION)).toBeGreaterThanOrEqual(123);
  });

  test("restricts content scripts to X and Twitter", () => {
    for (const script of productionManifest.content_scripts) {
      expect(script.matches).toEqual(["https://x.com/*", "https://twitter.com/*"]);
    }
  });
});

describe("development manifest overlay", () => {
  test("adds local http S3 origins so `bun run build:dev` stays usable", () => {
    const devManifest = createManifest({ dev: true });
    expect(devManifest.optional_host_permissions).toEqual(["https://*/*", "http://localhost/*", "http://127.0.0.1/*"]);
    expect(findForbiddenReleaseEntries(devManifest)).not.toEqual([]);
  });

  test("is rejected by the release assertions", () => {
    const issues = validateManifest(createManifest({ dev: true }), defaultCatalog);
    expect(issues.map((issue) => issue.code)).toContain("forbidden-origin");
  });
});

describe("manifest assertions", () => {
  test("report a manifest/package version mismatch", () => {
    const stale: ExtensionManifest = { ...productionManifest, version: "9.9.9" };
    const issues = validateManifest(stale, defaultCatalog);
    expect(issues.map((issue) => issue.code)).toContain("version-mismatch");
  });

  test("reject permissions and origins that only development needs", () => {
    const widened: ExtensionManifest = {
      ...productionManifest,
      permissions: [...productionManifest.permissions, "tabs"],
      optional_host_permissions: ["https://*/*", "http://localhost/*"],
    };
    const codes = validateManifest(widened, defaultCatalog).map((issue) => issue.code);
    expect(codes).toContain("permissions");
    expect(codes).toContain("optional-host-permissions");
    expect(codes).toContain("forbidden-origin");
  });

  test("report message references that the default locale does not define", () => {
    const unlocalized: ExtensionManifest = { ...productionManifest, description: "__MSG_missingDescription__" };
    const codes = new Set(validateManifest(unlocalized, defaultCatalog).map((issue) => issue.code));
    expect(codes).toEqual(new Set(["missing-message"]));
  });
});

describe("icon assets", () => {
  test("ship one PNG per declared size at the exact pixel dimensions", async () => {
    for (const size of ICON_SIZES) {
      const path = new URL(`../${productionManifest.icons[String(size)]}`, import.meta.url);
      const bytes = new Uint8Array(await Bun.file(path).arrayBuffer());
      expect(readPngDimensions(bytes)).toEqual({ width: size, height: size });
    }
  });

  test("are never substituted by a single oversized image", async () => {
    const sizes = await Promise.all(
      ICON_SIZES.map(async (size) => {
        const path = new URL(`../${productionManifest.icons[String(size)]}`, import.meta.url);
        return readPngDimensions(new Uint8Array(await Bun.file(path).arrayBuffer()))?.width;
      }),
    );
    expect(new Set(sizes).size).toBe(ICON_SIZES.length);
  });

  test("reject a file that is not a PNG", () => {
    expect(readPngDimensions(new Uint8Array([0x47, 0x49, 0x46]))).toBeNull();
  });
});

describe("manifest localization", () => {
  test("keeps every locale catalog in sync with the default locale", async () => {
    for (const locale of LOCALES) {
      const catalog = await readLocaleCatalog(locale);
      expect(compareLocaleCatalogs(defaultCatalog, catalog)).toEqual({ missing: [], extra: [], empty: [] });
    }
  });

  test("ships no locale directory outside the catalogs the build copies", async () => {
    const entries = await readdir(new URL("../_locales", import.meta.url), { withFileTypes: true });
    const directories = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    expect(directories.toSorted()).toEqual([...LOCALES].toSorted());
  });

  test("resolves every __MSG_ reference in both locales", async () => {
    const keys = messageReferenceKeys(productionManifest);
    expect(keys).toEqual(["actionTitle", "appDescription", "appName"]);
    for (const locale of LOCALES) {
      const catalog = await readLocaleCatalog(locale);
      for (const key of keys) expect(catalog[key]?.message).toBeTruthy();
    }
  });
});
