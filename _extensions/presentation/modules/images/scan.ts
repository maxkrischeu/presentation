// Build the media index without an external Python or Node installation.
import { basename, dirname, extname, join } from "stdlib/path";
import {
  exists,
  inside,
  isAbsolute,
  relative,
  resolve,
} from "../../server/paths.ts";
const extensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".webp",
  ".gif",
  ".avif",
  ".mp4",
  ".webm",
  ".m4v",
  ".xlsx",
]);
export async function scan(
  root: string,
  source: string,
  folders: unknown = ["assets"],
) {
  root = await Deno.realPath(root);
  source = await Deno.realPath(source);
  if (
    !Array.isArray(folders) || folders.some((f) => typeof f !== "string" || !f)
  ) throw Error("Media folders must be a list of project-relative paths.");
  const locations: [string, string][] = [];
  for (const folder of folders) {
    const path = resolve(root, folder);
    if (isAbsolute(folder) || !inside(root, path)) {
      throw Error("Media folders must stay inside the project.");
    }
    const actual = await exists(path) ? await Deno.realPath(path) : path;
    if (!inside(root, actual)) {
      throw Error("Media folders must stay inside the project.");
    }
    locations.push(["global", path]);
  }
  if (dirname(source) !== root) {
    locations.push(["lesson", join(dirname(source), "assets")]);
  }
  const result: Record<string, string>[] = [];
  const seen = new Set<string>();
  async function visit(folder: string, scope: string) {
    if (!await exists(folder)) return;
    for (
      const entry of [...Deno.readDirSync(folder)].sort((a, b) =>
        a.name < b.name ? -1 : a.name > b.name ? 1 : 0
      )
    ) {
      if (entry.name.startsWith(".")) continue;
      const path = join(folder, entry.name);
      if (entry.isDirectory) {
        await visit(path, scope);
        continue;
      }
      if (!extensions.has(extname(path).toLowerCase())) continue;
      if (!await exists(path)) continue;
      const actual = await Deno.realPath(path);
      if (
        !inside(root, actual) || seen.has(actual) ||
        !(await Deno.stat(path)).isFile
      ) continue;
      seen.add(actual);
      const src = relative(dirname(source), path).replaceAll("\\", "/");
      result.push({
        scope,
        id: "file:" + src,
        src,
        label: basename(path, extname(path)).replace(/[-_]+/g, " "),
        kind: /\.xlsx$/i.test(path) ? "spreadsheet" : /\.(mp4|webm|m4v)$/i.test(path) ? "video" : "image",
      });
    }
  }
  for (const [scope, path] of locations) await visit(path, scope);
  return result;
}
if (import.meta.main) {
  const result = await scan(
    Deno.args[0],
    Deno.args[1],
    Deno.args[2] ? JSON.parse(Deno.args[2]) : undefined,
  );
  console.log(JSON.stringify(result));
}
