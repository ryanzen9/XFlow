import { resolve, sep } from "node:path";

const siteRoot = resolve(import.meta.dir, "../site-dist");
const port = Number(Bun.env.SITE_PREVIEW_PORT || 43995);

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }

    let relativePath: string;
    try {
      relativePath = decodeURIComponent(new URL(request.url).pathname.slice(1));
    } catch {
      return new Response("Bad request", { status: 400 });
    }

    if (!relativePath || relativePath.endsWith("/")) relativePath += "index.html";
    const filePath = resolve(siteRoot, relativePath);
    if (filePath !== siteRoot && !filePath.startsWith(`${siteRoot}${sep}`)) {
      return new Response("Not found", { status: 404 });
    }

    const file = Bun.file(filePath);
    if (!(await file.exists())) return new Response("Not found", { status: 404 });

    return new Response(file, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": file.type || "application/octet-stream",
      },
    });
  },
});

console.log(`Project page preview: ${server.url}`);
