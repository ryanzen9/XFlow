import { describe, expect, test } from "bun:test";
import { createZip } from "./archive";
import { ICON_SIZES, LOCALES, createManifest, readLocaleCatalog } from "./manifest";
import {
  findForbiddenArchivePaths,
  planRelease,
  referencedCssAssets,
  referencedHtmlAssets,
  releaseArchiveName,
  requiredReleasePaths,
  resolveReleaseReference,
  scanReleaseText,
  verifyArchive,
} from "./release";

const encoder = new TextEncoder();
const productionManifest = createManifest();

function file(path: string, content: string) {
  return { path, data: encoder.encode(content) };
}

function page(bundle: string) {
  return (
    "<!doctype html><html><head>" +
    '<link rel="icon" href="logo-dark.png" media="(prefers-color-scheme: light)" />' +
    '<link rel="icon" href="logo.png" media="(prefers-color-scheme: dark)" />' +
    `<link rel="stylesheet" href="${bundle}.css" />` +
    `</head><body><script type="module" src="${bundle}.js"></script></body></html>`
  );
}

/** A miniature `dist/` that mirrors what `scripts/build.ts` really produces. */
async function releaseFixture() {
  const files = [
    file("manifest.json", JSON.stringify(productionManifest, null, 2)),
    file("background.js", "self.addEventListener('install', () => {});"),
    file("content.js", "console.log('content');"),
    file("content.css", "article { overflow: clip; }"),
    file("popup.html", page("popup")),
    file("popup.js", "console.log('popup');"),
    file("popup.css", "body { margin: 0; }"),
    file("dashboard.html", page("dashboard")),
    file("dashboard.js", "console.log('dashboard');"),
    file("dashboard.css", "body { margin: 0; }"),
    file("logo.png", "logo"),
    file("logo-dark.png", "logo"),
  ];
  for (const size of ICON_SIZES) files.push(file(`icons/icon-${size}.png`, `icon-${size}`));
  for (const locale of LOCALES) {
    files.push(file(`_locales/${locale}/messages.json`, JSON.stringify(await readLocaleCatalog(locale))));
  }
  return files;
}

function codes(files: Awaited<ReturnType<typeof releaseFixture>>) {
  return planRelease(files).issues.map((issue) => issue.code);
}

describe("release naming", () => {
  test("builds a versioned archive name", () => {
    expect(releaseArchiveName("0.1.0")).toBe("xflow-0.1.0.zip");
  });
});

describe("forbidden archive paths", () => {
  test("accept a clean extension package", () => {
    expect(findForbiddenArchivePaths(["manifest.json", "icons/icon-16.png", "_locales/en/messages.json"])).toEqual([]);
  });

  test.each([
    ["background.js.map", "archive-source-map"],
    ["src/background/index.ts", "archive-source-file"],
    ["src/background/index.ts", "archive-repository-path"],
    [".env", "archive-environment-file"],
    ["assets/.DS_Store", "archive-os-metadata"],
    ["key.pem", "archive-credential-file"],
    ["logs/sync.log", "archive-log-file"],
    ["node_modules/react/index.js", "archive-dependency-tree"],
    ["manifest.test.ts", "archive-test-file"],
    ["dist/manifest.json", "archive-nested-dist"],
  ])("reject %s", (path, code) => {
    expect(findForbiddenArchivePaths([path]).map((issue) => issue.code)).toContain(code);
  });
});

describe("forbidden bundle patterns", () => {
  test("flag dynamic execution with a line number", () => {
    expect(scanReleaseText("background.js", 'const a = 1;\nconst b = eval("2");\n')).toEqual([
      {
        code: "dynamic-eval",
        detail: "background.js:2: eval() executes strings and violates the Manifest V3 remote-code policy",
      },
    ]);
  });

  test.each([
    ["new Function('return 1')", "dynamic-function"],
    ["importScripts('https://cdn.example.com/x.js')", "remote-code-loader"],
    ["//# sourceMappingURL=content.js.map", "source-map-reference"],
    ["fetch('http://localhost:9000/bucket/key')", "development-origin"],
  ])("flag %s", (source, code) => {
    const target = code === "source-map-reference" ? "content.css" : "content.js";
    expect(scanReleaseText(target, source).map((issue) => issue.code)).toContain(code);
  });

  test("flag remote assets in extension pages", () => {
    const html = '<script src="https://cdn.example.com/tracker.js"></script>';
    expect(scanReleaseText("popup.html", html).map((issue) => issue.code)).toEqual(["remote-page-asset"]);
  });

  test("leave legitimate bundle content alone", () => {
    const source = [
      "const schema = 'http://json-schema.org/draft-07/schema#';",
      "const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');",
      "if (url.hostname === 'localhost') return true;",
      "const retrieval = new Map();",
      "fetch('https://openrouter.ai/api/v1/chat');",
    ].join("\n");
    expect(scanReleaseText("background.js", source)).toEqual([]);
  });

  test("only apply executable rules to executable files", () => {
    expect(scanReleaseText("_locales/en/messages.json", '{"message":"eval("}')).toEqual([]);
  });
});

describe("reference resolution", () => {
  test("resolves page and stylesheet references", () => {
    expect(resolveReleaseReference("popup.html", "popup.js")).toBe("popup.js");
    expect(resolveReleaseReference("pages/inner.html", "shared/app.js")).toBe("pages/shared/app.js");
    expect(resolveReleaseReference("icons/sheet.css", "../logo.png")).toBe("logo.png");
    expect(resolveReleaseReference("popup.html", "/icons/icon-16.png")).toBe("icons/icon-16.png");
  });

  test("ignores references that are not packaged files", () => {
    expect(resolveReleaseReference("popup.html", "https://example.com/x.js")).toBeNull();
    expect(resolveReleaseReference("popup.html", "//example.com/x.js")).toBeNull();
    expect(resolveReleaseReference("popup.html", "#main")).toBeNull();
    expect(resolveReleaseReference("dashboard.css", "data:image/svg+xml;base64,AAA")).toBeNull();
  });

  test("extracts html and css asset references", () => {
    expect(referencedHtmlAssets('<link href="a.css"><script src="b.js"></script>')).toEqual(["a.css", "b.js"]);
    expect(referencedCssAssets("a{background:url(logo.png)}b{src:url('f.woff2')}")).toEqual(["logo.png", "f.woff2"]);
    expect(referencedCssAssets("a{background:url(data:image/png;base64,AA)}")).toEqual(["data:image/png;base64,AA"]);
  });
});

describe("required release paths", () => {
  test("cover the manifest, its pages and both locale catalogs", async () => {
    const files = await releaseFixture();
    const required = requiredReleasePaths({
      manifest: productionManifest,
      locales: LOCALES,
      html: files
        .filter((entry) => entry.path.endsWith(".html"))
        .map((entry) => ({
          path: entry.path,
          source: new TextDecoder().decode(entry.data),
        })),
      css: [],
    });
    expect(required).toEqual(files.map((entry) => entry.path).toSorted());
  });
});

describe("release plan", () => {
  test("accepts a package that matches the manifest exactly", async () => {
    const files = await releaseFixture();
    const plan = planRelease(files);
    expect(plan.issues).toEqual([]);
    expect(plan.manifest?.version).toBe(productionManifest.version);
    expect(plan.required).toHaveLength(files.length);
  });

  test("rejects a packaged file that nothing references", async () => {
    const files = await releaseFixture();
    files.push(file("leftover.js", "console.log('leftover');"));
    expect(codes(files)).toEqual(["unreferenced-asset"]);
  });

  test("rejects a manifest reference that is not packaged", async () => {
    const files = (await releaseFixture()).filter((entry) => entry.path !== "content.css");
    expect(codes(files)).toContain("missing-asset");
  });

  test("rejects a source map next to the bundled code", async () => {
    const files = await releaseFixture();
    files.push(file("background.js.map", "{}"));
    expect(codes(files)).toContain("archive-source-map");
  });

  test("rejects a manifest without a root manifest.json", async () => {
    const files = (await releaseFixture()).filter((entry) => entry.path !== "manifest.json");
    const plan = planRelease(files);
    expect(plan.manifest).toBeNull();
    expect(plan.issues.map((issue) => issue.code)).toContain("missing-manifest");
  });
});

describe("archive verification", () => {
  test("accepts an archive built from the packaged files", async () => {
    const files = await releaseFixture();
    const archive = createZip(files, { first: "manifest.json" });
    expect(verifyArchive(files, archive)).toEqual([]);
    expect(archive.byteLength).toBeGreaterThan(0);
  });

  test("reports a file that changed inside the archive", async () => {
    const files = await releaseFixture();
    const archive = createZip(files);
    const tampered = files.map((entry) =>
      entry.path === "background.js"
        ? { path: entry.path, data: encoder.encode("x".repeat(entry.data.byteLength)) }
        : entry,
    );
    expect(verifyArchive(tampered, archive).map((issue) => issue.code)).toEqual(["archive-content"]);
  });

  test("reports a file whose size changed inside the archive", async () => {
    const files = await releaseFixture();
    const archive = createZip(files);
    const tampered = files.map((entry) =>
      entry.path === "background.js" ? { path: entry.path, data: encoder.encode("shorter") } : entry,
    );
    expect(verifyArchive(tampered, archive).map((issue) => issue.code)).toEqual(["archive-size"]);
  });

  test("reports a file that is missing from the archive listing", async () => {
    const files = await releaseFixture();
    const archive = createZip(files.filter((entry) => entry.path !== "content.css"));
    expect(verifyArchive(files, archive).map((issue) => issue.code)).toEqual(["archive-listing"]);
  });
});
