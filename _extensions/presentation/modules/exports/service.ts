// Session export transport using Quartos bundled runtime.
import { basename, dirname, extname, join } from "stdlib/path";
import { exists, inside, relative, resolve } from "../../server/paths.ts";
import { escapeHtml, sourceMetadata, unescapeHtml } from "../images/source.ts";
import { exportPdf } from "./worker.ts";
export const REQUEST_LIMIT = 64000000;
function validate(data: any) {
  if (!["slides", "chalkboard", "presentation"].includes(data.kind)) {
    throw Error("Unknown export type.");
  }
  const s = data.snapshot;
  if (
    !s || s.version !== 2 || !s.modules?.images?.slides ||
    Array.isArray(s.modules.images.slides)
  ) throw Error("Invalid session snapshot.");
  for (const name of ["notes", "boards"]) {
    const pages = s.modules?.drawing?.drawings?.[name];
    if (
      !Array.isArray(pages) || pages.length > 2000 ||
      pages.some((p) =>
        typeof p?.png !== "string" ||
        !p.png.startsWith("data:image/png;base64,")
      )
    ) throw Error("Invalid drawing pages.");
  }
  return s;
}
// ZIP uses the STORE method: portable and dependency-free; media is already compressed.
function zip(files: Map<string, Uint8Array>) {
  const chunks: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0, centralSize = 0;
  const encoder = new TextEncoder();
  const crc = (bytes: Uint8Array) => {
    let value = 0xffffffff;
    for (const b of bytes) {
      value ^= b;
      for (let i = 0; i < 8; i++) {
        value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
      }
    }
    return (value ^ 0xffffffff) >>> 0;
  };
  for (const [name, bytes] of files) {
    const n = encoder.encode(name);
    if (bytes.length > 0xffffffff || offset > 0xffffffff || n.length > 65535) {
      throw Error("Presentation is too large for ZIP export.");
    }
    const checksum = crc(bytes),
      header = new Uint8Array(30 + n.length),
      h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x800, true);
    h.setUint32(14, checksum, true);
    h.setUint32(18, bytes.length, true);
    h.setUint32(22, bytes.length, true);
    h.setUint16(26, n.length, true);
    header.set(n, 30);
    chunks.push(header, bytes);
    const c = new Uint8Array(46 + n.length), v = new DataView(c.buffer);
    v.setUint32(0, 0x02014b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 20, true);
    v.setUint16(8, 0x800, true);
    v.setUint32(16, checksum, true);
    v.setUint32(20, bytes.length, true);
    v.setUint32(24, bytes.length, true);
    v.setUint16(28, n.length, true);
    v.setUint32(42, offset, true);
    c.set(n, 46);
    central.push(c);
    centralSize += c.length;
    offset += header.length + bytes.length;
  }
  if (files.size > 65535 || offset + centralSize > 0xffffffff) {
    throw Error("Presentation is too large for ZIP export.");
  }
  const end = new Uint8Array(22), v = new DataView(end.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(8, files.size, true);
  v.setUint16(10, files.size, true);
  v.setUint32(12, centralSize, true);
  v.setUint32(16, offset, true);
  const result = new Uint8Array(offset + centralSize + 22);
  let at = 0;
  for (const c of [...chunks, ...central, end]) {
    result.set(c, at);
    at += c.length;
  }
  return result;
}
async function packageSession(
  output: string,
  page: string,
  snapshot: any,
  pdf: Uint8Array,
) {
  let document = await Deno.readTextFile(page);
  document = document.replace(
    /<div\b[^>]*class="presentation-media-resources"[^>]*>[\s\S]*?<\/div>/g,
    "",
  );
  const used = new Set<string>(
    Object.values(snapshot.modules.images.slides).flatMap((items: any) =>
      items.map((i: any) => i.asset)
    ),
  );
  document = document.replace(
    /(<template\b[^>]*class=["']presentation-assets-source["'][^>]*>)([\s\S]*?)(<\/template>)/g,
    (_, opening, content, closing) => {
      const scope = opening.match(/data-scope=["']([^"']+)/)?.[1] || "";
      return opening + content.replace(/<img\b[^>]*>/g, (tag: string) => {
        const id = tag.match(/data-asset-id=["']([^"']+)/)?.[1];
        return id &&
            [...used].some((a) =>
              a === scope + ":" + unescapeHtml(id) ||
              (scope === "slide" && a.endsWith(":" + unescapeHtml(id)))
            )
          ? tag
          : "";
      }) + closing;
    },
  );
  document = document.replace(
    /(<template id="presentation-prepared-layout">)[\s\S]*?(<\/template>)/g,
    "$1{}$2",
  );
  for (const entry of snapshot.modules.images.assets || []) {
    if (!used.has(entry.id)) continue;
    const colon = entry.id.indexOf(":"),
      scope = entry.id.slice(0, colon),
      identifier = entry.id.slice(colon + 1),
      src = String(entry.src || "");
    if (/^[\w+.-]+:/.test(src) && !/^https?:|^data:(image|video)\//.test(src)) {
      throw Error("Invalid media URL.");
    }
    const attrs = {
      "data-asset-id": identifier,
      "data-media-kind": entry.kind || "image",
      src,
      alt: entry.label || "",
    };
    const tag = "<img " + Object.entries(attrs).map(([k, v]) =>
      k + '="' + escapeHtml(v) + '"'
    ).join(" ") + ">";
    const catalog =
      '<template class="presentation-assets-source" data-scope="' +
      escapeHtml(["global", "lesson"].includes(scope) ? scope : "slide") +
      '">' + tag + "</template>";
    if (["global", "lesson"].includes(scope)) {
      document = document.replace("<body", catalog + "<body");
    } else {document = document.replace(/<section\b[^>]*>/g, (s) =>
        s.match(/id="([^"]+)"/)?.[1] === scope ? s + catalog : s);}
  }
  const files = new Set([page]);
  async function walk(dir: string) {
    if (!await exists(dir)) return;
    for (const e of Deno.readDirSync(dir)) {
      const p = join(dir, e.name);
      if (e.isDirectory) await walk(p);
      else if (e.isFile && inside(output, await Deno.realPath(p))) files.add(p);
    }
  }
  await walk(
    join(dirname(page), basename(page, extname(page)) + "_files", "libs"),
  );
  const pending = [...files];
  while (pending.length) {
    const file = pending.pop()!;
    if (![".html", ".css"].includes(extname(file))) continue;
    const text = file === page ? document : await Deno.readTextFile(file);
    const refs = [
      ...text.matchAll(/(?:src|href|poster)=["']([^"']+)/g),
      ...text.matchAll(/url\(["']?([^\)"']+)/g),
    ];
    for (const m of refs) {
      const ref = unescapeHtml(m[1]);
      if (/^[\w+.-]+:|^\/\//.test(ref)) continue;
      const path = resolve(
        ref.startsWith("/") ? output : dirname(file),
        decodeURIComponent(ref.split(/[?#]/)[0]).replace(/^\//, ""),
      );
      if (
        !inside(output, path) || !await exists(path) ||
        !inside(output, await Deno.realPath(path)) ||
        !(await Deno.stat(path)).isFile || files.has(path)
      ) continue;
      files.add(path);
      pending.push(path);
    }
  }
  document = document.replace(
    /(<template id="presentation-source-layout">)[\s\S]*?(<\/template>)/g,
    "$1{}$2",
  ).replace(
    /<head[^>]*>/i,
    (m) =>
      m + "<script>window.__presentationSession=" +
      JSON.stringify(snapshot).replaceAll("<", "\\u003c") + ";</script>",
  );
  const archive = new Map<string, Uint8Array>(),
    encode = (s: string) => new TextEncoder().encode(s);
  for (const file of [...files].sort()) {
    const name = relative(output, file).replaceAll("\\", "/");
    if (
      name.split("/").some(part => part.startsWith(".") || part === "node_modules") ||
      /\.(qmd|py|ts|yml|yaml|toml)$/.test(name)
    ) continue;
    archive.set(
      name,
      file === page ? encode(document) : await Deno.readFile(file),
    );
  }
  const name = relative(output, page).replaceAll("\\", "/");
  archive.set(name.replace(/\.html$/, ".pdf"), pdf);
  archive.set("session.json", encode(JSON.stringify(snapshot, null, 2)));
  archive.set(
    "README.txt",
    encode(
      "Presentation snapshot\n\nExtract the entire ZIP and open " + name +
        ".\nExternal content and interactive Python packages may require internet.\nThe source QMD is not included. Save to Source requires the original project preview.\n",
    ),
  );
  return zip(archive);
}
export async function handle(
  root: string,
  output: string,
  page: string,
  data: any,
  port: number,
) {
  const snapshot = validate(data), metadata = await sourceMetadata(page);
  if (snapshot.modules.images.revision !== metadata.revision) {
    throw Error(
      "The presentation was rendered again. Reload it before exporting.",
    );
  }
  const temp = await Deno.makeTempDir({ prefix: "presentation-export-" });
  try {
    const destination = join(temp, "export.pdf"),
      request = {
        url: "http://127.0.0.1:" + port + "/" +
          relative(output, page).split(/[\\/]/).map(encodeURIComponent).join(
            "/",
          ),
        destination,
        kind: data.kind === "presentation" ? "slides" : data.kind,
        snapshot,
        options: data.kind === "presentation"
          ? {
            content: "current",
            images: true,
            drawings: true,
            hidden: false,
            boards: true,
          }
          : data.options || {},
      };
    await exportPdf(request);
    const pdf = await Deno.readFile(destination);
    return data.kind === "presentation"
      ? {
        body: await packageSession(output, page, snapshot, pdf),
        mime: "application/zip",
      }
      : { body: pdf, mime: "application/pdf" };
  } finally {
    await Deno.remove(temp, { recursive: true });
  }
}
