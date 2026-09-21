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

const builds: Array<{ entrypoint: string; format: "esm" | "iife"; outputName: string }> = [
  { entrypoint: "src/background/index.ts", format: "esm", outputName: "background" },
  { entrypoint: "src/content/index.tsx", format: "iife", outputName: "content" },
  { entrypoint: "src/popup/index.tsx", format: "esm", outputName: "popup" },
  { entrypoint: "src/dashboard/index.tsx", format: "esm", outputName: "dashboard" },
];

for (const build of builds) {
  const result = await Bun.build({
    entrypoints: [build.entrypoint],
    outdir: "dist",
    target: "browser",
    format: build.format,
    naming: `${build.outputName}.[ext]`,
    sourcemap: "external",
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
  ["manifest.json", "dist/manifest.json"],
  ["popup.html", "dist/popup.html"],
  ["dashboard.html", "dist/dashboard.html"],
] as const;

for (const [source, destination] of staticFiles) {
  await Bun.write(destination, Bun.file(source));
}

console.log("Built XFilter extension in dist/");
