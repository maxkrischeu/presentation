import { basename, dirname, extname, join } from "stdlib/path";
import { decodeBase64, encodeBase64 } from "stdlib/base64";
import { scan } from "./scan.ts";
import { resolveSource, sourceMetadata } from "./source.ts";
import { digest, exists, inside, resolve } from "../../server/paths.ts";
export const REQUEST_LIMIT = 18 * 1024 * 1024;
export async function handle(
  root: string,
  output: string,
  page: string,
  data: any,
  _port: number,
) {
  const { path: source } = await resolveSource(root, output, page);
  if (data.action === "list") {
    const metadata = await sourceMetadata(page),
      entries = await scan(
        root,
        source,
        metadata.mediaFoldersEmpty ? [] : metadata.mediaFolders,
      );
    for (const entry of entries) {
      const original = await Deno.realPath(resolve(dirname(source), entry.src)),
        destination = resolve(dirname(page), entry.src);
      if (!inside(output, destination) || original === destination) continue;
      await Deno.mkdir(dirname(destination), { recursive: true });
      const actualParent = await Deno.realPath(dirname(destination));
      if (!inside(output, actualParent)) throw Error("Invalid output folder.");
      if (
        await exists(destination) &&
        !inside(output, await Deno.realPath(destination))
      ) throw Error("Invalid output file.");
      if (
        !await exists(destination) ||
        (await Deno.stat(original)).mtime! >
          (await Deno.stat(destination)).mtime!
      ) await Deno.copyFile(original, destination);
    }
    return { assets: entries };
  }
  if (data.action !== "import") throw Error("Unknown asset operation.");
  const raw = decodeBase64(data.bytes || "");
  const ascii = (a: number, b: number) =>
    new TextDecoder().decode(raw.slice(a, b));
  const extension =
    raw[0] === 137 && ascii(1, 4) === "PNG" && ascii(4, 8) === "\r\n\x1a\n"
      ? ".png"
      : ["GIF87a", "GIF89a"].includes(ascii(0, 6))
      ? ".gif"
      : raw.length > 12 && ascii(4, 8) === "ftyp"
      ? ".mp4"
      : raw[0] === 0x1a && raw[1] === 0x45 && raw[2] === 0xdf && raw[3] === 0xa3
      ? ".webm"
      : null;
  if (!extension || raw.length > 12 * 1024 * 1024) {
    throw Error("Expected PNG, GIF, MP4 or WebM up to 12 MB.");
  }
  const folder = join(dirname(source), "assets");
  await Deno.mkdir(folder, { recursive: true });
  if (!inside(root, await Deno.realPath(folder))) {
    throw Error("Invalid assets folder.");
  }
  const original = basename(String(data.name || "image")),
    name =
      basename(original, extname(original)).replace(/[^\p{L}\p{N}_-]+/gu, "-")
        .replace(/^-+|-+$/g, "").slice(0, 60) || "image";
  const target = join(
    folder,
    name + "-" + (await digest(raw)).slice(0, 12) + extension,
  );
  if (await exists(target)) {
    if (!inside(root, await Deno.realPath(target))) {
      throw Error("Invalid image path.");
    }
    if (await digest(await Deno.readFile(target)) !== await digest(raw)) {
      throw Error("Image name collision.");
    }
  } else await Deno.writeFile(target, raw, { createNew: true });
  const asset = (await scan(root, source)).find((x) =>
    x.src === "assets/" + basename(target)
  );
  if (!asset) throw Error("Imported media not found.");
  const mime = ({
    ".png": "image/png",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
  } as Record<string, string>)[extension];
  return {
    asset: { ...asset, data: "data:" + mime + ";base64," + encodeBase64(raw) },
  };
}
