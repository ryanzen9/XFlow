import { DEFAULT_LOCALE, LOCALES, createManifest, readLocaleCatalog, validateManifest } from "./manifest";

// Fail fast: the release manifest must stay free of development origins, and
// `bun run build:dev` may only widen the optional host permissions.
// `bun run build -- --release` (used by `bun run release:package`) ships no
// source maps, so the upload contains neither maps nor dangling map comments.
const dev = Bun.argv.includes("--dev");
const release = Bun.argv.includes("--release");
if (dev && release) throw new Error("--dev and --release are mutually exclusive.");
const productionIssues = validateManifest(createManifest(), await readLocaleCatalog(DEFAULT_LOCALE));
if (productionIssues.length > 0) {
  for (const issue of productionIssues) console.error(`manifest: ${issue.code}: ${issue.detail}`);
  process.exit(1);
}

const zodCspPlugin: Bun.BunPlugin = {
  name: "zod-csp-safe",
  setup(builder) {
    builder.onLoad({ filter: /node_modules\/zod\/v4\/core\/util\.js$/ }, async ({ path }) => {
      const source = await Bun.file(path).text();
      const evalProbe = /const F = Function;\s*new F\(""\);\s*return true;/;
      if (!evalProbe.test(source)) throw new Error("Unable to disable the Zod eval capability probe.");

      return {
        contents: source.replace(evalProbe, "return false;"),
        loader: "js",
      };
    });
  },
};

const builds: Array<{
  entrypoint: string;
  format: "esm" | "iife";
  outputName: string;
}> = [
  {
    entrypoint: "src/background/index.ts",
    format: "esm",
    outputName: "background",
  },
  {
    entrypoint: "src/content/index.tsx",
    format: "iife",
    outputName: "content",
  },
  { entrypoint: "src/popup/index.tsx", format: "esm", outputName: "popup" },
  {
    entrypoint: "src/dashboard/index.tsx",
    format: "esm",
    outputName: "dashboard",
  },
];

for (const build of builds) {
  const result = await Bun.build({
    entrypoints: [build.entrypoint],
    outdir: "dist",
    target: "browser",
    format: build.format,
    naming: `${build.outputName}.[ext]`,
    sourcemap: release ? "none" : "external",
    minify: true,
    plugins: [zodCspPlugin],
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
      process: JSON.stringify({ env: { NODE_ENV: "production" } }),
    },
  });

  if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
  }
}

for (const [input, output] of [
  ["src/popup/popup.css", "dist/popup.css"],
  ["src/dashboard/styles/dashboard.css", "dist/dashboard.css"],
] as const) {
  const process = Bun.spawn(["./node_modules/.bin/tailwindcss", "-i", input, "-o", output, "--minify"], {
    stdout: "inherit",
    stderr: "inherit",
  });
  if ((await process.exited) !== 0) throw new Error(`Tailwind build failed for ${input}`);
}

const staticFiles = [
  ["popup.html", "dist/popup.html"],
  ["dashboard.html", "dist/dashboard.html"],
  ["logo.png", "dist/logo.png"],
  ["logo-dark.png", "dist/logo-dark.png"],
] as const;

for (const [source, destination] of staticFiles) {
  await Bun.write(destination, Bun.file(source));
}

// `bun run build:dev` keeps local http S3 endpoints testable; the production
// manifest validated above is the one that ships.
const manifest = createManifest({ dev });
await Bun.write("dist/manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);

const iconSources = new Set(Object.values(manifest.icons));
for (const source of iconSources) {
  await Bun.write(`dist/${source}`, Bun.file(source));
}

for (const locale of LOCALES) {
  await Bun.write(`dist/_locales/${locale}/messages.json`, Bun.file(`_locales/${locale}/messages.json`));
}

console.log(
  `Built XFlow extension in dist/${dev ? " (development manifest)" : ""}${release ? " (release, no source maps)" : ""}`,
);
