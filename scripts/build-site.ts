import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import SiteApp, { type SitePage } from "../site/src/app";

const repositoryRoot = resolve(import.meta.dir, "..");
const outputRoot = resolve(repositoryRoot, "site-dist");
const assetsRoot = resolve(outputRoot, "assets");

const pages: Array<{ page: SitePage; file: string; lang: string; title: string; description: string }> = [
  {
    page: "home",
    file: "index.html",
    lang: "zh-CN",
    title: "XFlow — 让噪声退场，把选择留给你",
    description: "XFlow 使用 Jev 按你的规则过滤 X 帖子与评论。命中内容仍可揭示，Provider 凭据保存在本机。",
  },
  {
    page: "privacy-zh",
    file: "privacy.html",
    lang: "zh-CN",
    title: "隐私政策 — XFlow",
    description: "XFlow 官网与浏览器扩展的数据处理、存储与同步说明。",
  },
  {
    page: "privacy-en",
    file: "privacy-en.html",
    lang: "en",
    title: "XFlow Privacy Policy",
    description: "How the XFlow website and browser extension process, store, and sync data.",
  },
];

function htmlDocument({ page, lang, title, description }: (typeof pages)[number]) {
  const markup = renderToString(createElement(SiteApp, { page }));

  return `<!doctype html>
<html lang="${lang}" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${description}" />
    <title>${title}</title>
    <link rel="stylesheet" href="./assets/tokens.css" />
    <link rel="stylesheet" href="./assets/site.css" />
  </head>
  <body>
    <div id="root" data-page="${page}">${markup}</div>
    <script type="module" src="./assets/client.js"></script>
  </body>
</html>
`;
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(assetsRoot, { recursive: true });

for (const page of pages) {
  await Bun.write(resolve(outputRoot, page.file), htmlDocument(page));
}

await Promise.all([
  copyFile(resolve(repositoryRoot, "src/styles/token.css"), resolve(assetsRoot, "tokens.css")),
  copyFile(resolve(repositoryRoot, "site/src/site.css"), resolve(assetsRoot, "site.css")),
  Bun.write(resolve(outputRoot, ".nojekyll"), ""),
]);

const clientBuild = await Bun.build({
  entrypoints: [resolve(repositoryRoot, "site/src/client.tsx")],
  outdir: assetsRoot,
  target: "browser",
  minify: true,
});

if (!clientBuild.success) {
  console.error("Could not build the XFlow website client:");
  for (const log of clientBuild.logs) console.error(log);
  process.exit(1);
}

const redirectPages = [
  ["privacy-policy/index.html", "../privacy-en.html", "XFlow Privacy Policy"],
  ["privacy-policy/zh-CN/index.html", "../../privacy.html", "XFlow 隐私政策"],
] as const;

for (const [file, destination, title] of redirectPages) {
  const path = resolve(outputRoot, file);
  await mkdir(resolve(path, ".."), { recursive: true });
  await Bun.write(
    path,
    `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${destination}"><link rel="canonical" href="${destination}"><title>${title}</title></head><body><a href="${destination}">Continue to XFlow</a></body></html>`,
  );
}

console.log(`Built React website and privacy pages in ${outputRoot}`);
