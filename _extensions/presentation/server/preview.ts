// Local transport, independent of feature implementations and external runtimes.
import { dirname, extname, fromFileUrl, join, toFileUrl } from "stdlib/path";
import { contentType } from "stdlib/mediaTypes";
import { digest, exists, inside, relative, resolve } from "./paths.ts";
const root = await Deno.realPath(
  Deno.env.get("QUARTO_PROJECT_DIR") || Deno.cwd(),
);
const output = await Deno.realPath(
  Deno.env.get("PRESENTATION_OUTPUT_DIR") || root,
);
const portIndex = Deno.args.indexOf("--port"),
  port = portIndex < 0 ? 8766 : Number(Deno.args[portIndex + 1]);
const liveReload = Deno.args.includes("--live-reload"),
  token = crypto.randomUUID() + crypto.randomUUID();
const services = new Map<string, { handle: Function; limit: number }>();
const modules = join(dirname(fromFileUrl(import.meta.url)), "../modules");
for (const entry of Deno.readDirSync(modules)) {
  if (!entry.isDirectory) continue;
  const directory = join(modules, entry.name),
    manifest = join(directory, "module.json");
  if (!await exists(manifest)) continue;
  const module = JSON.parse(await Deno.readTextFile(manifest));
  for (const [name, file] of Object.entries(module.server || {})) {
    const path = await Deno.realPath(resolve(directory, String(file)));
    if (!inside(await Deno.realPath(directory), path)) {
      throw Error("Invalid module service.");
    }
    const endpoint = "/__presentation/" + name;
    if (services.has(endpoint)) throw Error("Duplicate endpoint: " + endpoint);
    const implementation = await import(toFileUrl(path).href);
    services.set(endpoint, {
      handle: implementation.handle,
      limit: implementation.REQUEST_LIMIT || 1000000,
    });
  }
}
let busy = false;
const json = (status: number, data: any) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
function local(request: Request) {
  const host = request.headers.get("host");
  return ["localhost:" + port, "127.0.0.1:" + port].includes(host || "") &&
    (!request.headers.has("origin") ||
      request.headers.get("origin") === "http://" + host);
}
async function safePage(path: string) {
  const candidate = resolve(
    output,
    "." + (path.startsWith("/") ? path : "/" + path),
  );
  if (!inside(output, candidate)) throw Error("Invalid preview document.");
  const actual = await Deno.realPath(candidate);
  if (!inside(output, actual)) throw Error("Invalid preview document.");
  return actual;
}
async function pageRevision(page: string) {
  try {
    const revisions = JSON.parse(
      await Deno.readTextFile(join(output, ".quarto/presentation/render.json")),
    );
    const revision = revisions[relative(output, page).replaceAll("\\", "/")];
    if (revision) return revision;
  } catch {}
  return await digest(await Deno.readFile(page));
}
async function requestBody(request: Request, limit: number) {
  const length = Number(request.headers.get("content-length"));
  if (!Number.isSafeInteger(length) || length <= 0 || length > limit) {
    throw Error("Invalid request size.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw Error("Expected a request object.");
  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit || total > length) {
      await reader.cancel();
      throw Error("Invalid request size.");
    }
    chunks.push(value);
  }
  if (total !== length) throw Error("Invalid request size.");
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (!data || Array.isArray(data) || typeof data !== "object") {
    throw Error("Expected a request object.");
  }
  return data;
}
async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "POST") {
    const service = services.get(url.pathname);
    if (
      !service || !local(request) ||
      request.headers.get("X-Presentation-Token") !== token
    ) return json(403, { error: "Local preview only." });
    if (busy) {
      return json(409, {
        error: "Another operation is running. Please try again shortly.",
      });
    }
    busy = true;
    try {
      const data = await requestBody(request, service.limit),
        page = await safePage(
          decodeURIComponent(new URL(data.page, "http://localhost").pathname),
        );
      if (extname(page) !== ".html") throw Error("Invalid preview document.");
      const result = await service.handle(root, output, page, data, port);
      if (result?.body instanceof Uint8Array) {
        return new Response(result.body, {
          headers: { "Content-Type": result.mime, "Cache-Control": "no-store" },
        });
      }
      return json(200, result);
    } catch (e) {
      return json(409, { error: String((e as Error).message) });
    } finally {
      busy = false;
    }
  }
  if (!["GET", "HEAD"].includes(request.method)) {
    return json(405, { error: "Method not allowed." });
  }
  if (url.pathname === "/__presentation/source") {
    return local(request)
      ? json(200, { token, liveReload })
      : json(403, { error: "Local preview only." });
  }
  if (
    url.pathname === "/favicon.ico" &&
    !await exists(join(output, "favicon.ico"))
  ) return new Response(null, { status: 204 });
  if (url.pathname === "/") {
    try {
      const registered = JSON.parse(
        await Deno.readTextFile(join(output, ".quarto/presentation/render.json")),
      );
      const pages = [];
      for (const name of Object.keys(registered)) {
        try {
          const page = await safePage("/" + name);
          pages.push({
            page,
            time: (await Deno.stat(page)).mtime?.getTime() || 0,
          });
        } catch {}
      }
      pages.sort((a, b) => b.time - a.time);
      if (pages.length) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: "/" +
              relative(output, pages[0].page).split(/[\\/]/).map(
                encodeURIComponent,
              ).join("/"),
          },
        });
      }
    } catch {}
  }
  if (url.pathname === "/__presentation/revision") {
    try {
      const page = await safePage(
        decodeURIComponent(url.searchParams.get("page") || ""),
      );
      if (extname(page) !== ".html") throw Error();
      return json(200, { revision: await pageRevision(page) });
    } catch {
      return json(404, { error: "Unknown presentation." });
    }
  }
  try {
    const decoded = decodeURIComponent(url.pathname);
    if (
      decoded.split("/").some(part => part.startsWith(".") || part === "node_modules") ||
      [".qmd", ".py", ".ts", ".yml", ".yaml", ".toml"].includes(
        extname(decoded),
      )
    ) return json(403, { error: "Source files are not served." });
    const page = await safePage(decoded), stat = await Deno.stat(page);
    if (!stat.isFile) return json(404, { error: "Not found." });
    const headers = new Headers({
      "Content-Type": contentType(extname(page)) || "application/octet-stream",
      "Cache-Control": "no-store, max-age=0",
      "Accept-Ranges": "bytes",
    });
    if (liveReload && extname(page) === ".html") {
      const document = await Deno.readTextFile(page),
        revision = await pageRevision(page);
      const script =
        `<script>(()=>{if(new URLSearchParams(location.search).has('print-pdf'))return;const revision=${
          JSON.stringify(revision)
        };async function check(){try{const r=await fetch('/__presentation/revision?page='+encodeURIComponent(location.pathname),{cache:'no-store'});if(r.ok&&(await r.json()).revision!==revision){location.reload();return;}}catch{}setTimeout(check,1000);}setTimeout(check,1000);})();</script>`;
      const body = new TextEncoder().encode(
        document.replace("</body>", script + "</body>"),
      );
      headers.set("Content-Length", String(body.length));
      return new Response(request.method === "HEAD" ? null : body, { headers });
    }
    let start = 0, end = stat.size - 1, status = 200;
    const range = request.headers.get("range");
    if (range) {
      const m = range.match(/^bytes=(\d*)-(\d*)$/);
      if (!m || (!m[1] && !m[2])) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": "bytes */" + stat.size },
        });
      }
      if (m[1]) {
        start = Number(m[1]);
        end = m[2] ? Math.min(Number(m[2]), end) : end;
      } else start = Math.max(0, stat.size - Number(m[2]));
      if (start > end || start >= stat.size) {
        return new Response(null, {
          status: 416,
          headers: { "Content-Range": "bytes */" + stat.size },
        });
      }
      status = 206;
      headers.set("Content-Range", `bytes ${start}-${end}/${stat.size}`);
    }
    headers.set("Content-Length", String(Math.max(0, end - start + 1)));
    if (request.method === "HEAD") {
      return new Response(null, { status, headers });
    }
    const file = await Deno.open(page);
    await file.seek(start, Deno.SeekMode.Start);
    let remaining = end - start + 1, closed = false;
    const close = () => {
      if (!closed) {
        closed = true;
        file.close();
      }
    };
    const stream = new ReadableStream({
      async pull(controller) {
        try {
          const chunk = new Uint8Array(Math.min(65536, remaining));
          if (!chunk.length) {
            close();
            controller.close();
            return;
          }
          const n = await file.read(chunk);
          if (n === null) {
            close();
            controller.close();
            return;
          }
          remaining -= n;
          controller.enqueue(chunk.subarray(0, n));
        } catch (e) {
          close();
          controller.error(e);
        }
      },
      cancel() {
        close();
      },
    });
    return new Response(stream, { status, headers });
  } catch (e) {
    return json(e instanceof Deno.errors.NotFound ? 404 : 403, {
      error: "Resource unavailable.",
    });
  }
}
Deno.serve({
  hostname: "127.0.0.1",
  port,
  onListen() {
    console.log(`Presentation preview ready: http://127.0.0.1:${port}/`);
  },
  onError(e) {
    if (Deno.env.get("PRESENTATION_DEBUG") === "1") console.error(e);
    return json(500, { error: "Request failed." });
  },
}, handle);
