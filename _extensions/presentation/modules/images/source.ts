// Conflict-checked QMD writer. Preserve text, managed blocks and exact backups.
import { basename, dirname, extname, join } from "stdlib/path";
import { digest, inside, relative, resolve } from "../../server/paths.ts";
export const REQUEST_LIMIT = 1000000;
export function unescapeHtml(s: string): string {
  return s.replace(
    /&#(x[0-9a-f]+|\d+);|&(amp|lt|gt|quot|apos|#39);/gi,
    (_, num, name) =>
      num
        ? String.fromCodePoint(
          parseInt(num.replace(/^x/i, ""), /^x/i.test(num) ? 16 : 10),
        )
        : ({
          amp: "&",
          lt: "<",
          gt: ">",
          quot: '"',
          apos: "'",
          "#39": "'",
        } as Record<string, string>)[name.toLowerCase()] || _,
  );
}
export function escapeHtml(s: unknown): string {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
    }[c]!),
  );
}
function lines(text: string) {
  return text.match(/[^\n]*\n|[^\n]+$/g) || [];
}
function tokens(text: string): string[] {
  const result: string[] = [];
  let token = "", quote = "", active = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = "";
      else if (
        c === "\\" && quote === '"' && i + 1 < text.length &&
        ['"', "\\"].includes(text[i + 1])
      ) token += text[++i];
      else token += c;
    } else if (c === '"' || c === "'") {
      quote = c;
      active = true;
    } else if (/\s/.test(c)) {
      if (active) result.push(token);
      token = "";
      active = false;
    } else if (c === "\\" && i + 1 < text.length) {
      token += text[++i];
      active = true;
    } else {
      token += c;
      active = true;
    }
  }
  if (quote) throw Error("Unclosed attribute quote.");
  if (active) result.push(token);
  return result;
}
export function headings(text: string): [number, number, string][] {
  const result: [number, number, string][] = [];
  let offset = 0, fence = "", yaml = false, comment = false, n = 0;
  for (const line of lines(text)) {
    const stripped = line.trim();
    if (n === 0 && stripped === "---") yaml = true;
    else if (yaml) { if (["---", "..."].includes(stripped)) yaml = false; }
    else if (comment) { if (line.includes("-->")) comment = false; }
    else if (line.includes("<!--")) comment = !line.includes("-->");
    else if (fence) {
      if (
        new RegExp("^ {0,3}" + fence[0] + "{" + fence.length + ",}\\s*$").test(
          line,
        )
      ) fence = "";
    } else {
      const f = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (f) fence = f[1];
      else if (/^ {0,3}#{1,6}(?:[ \t]|$)/.test(line.replace(/[\r\n]+$/, ""))) {
        result.push([offset, offset + line.length, line]);
      }
    }
    offset += line.length;
    n++;
  }
  return result;
}
function layoutBlocks(text: string): [string, number, number, string][] {
  const result: [string, number, number, string][] = [];
  let offset = 0,
    fence = "",
    start = 0,
    managed = false,
    yaml = false,
    comment = false,
    placed: number | null = null,
    n = 0;
  for (const line of lines(text)) {
    const stripped = line.trim(), bare = line.replace(/[\r\n]+$/, "");
    if (n === 0 && stripped === "---") yaml = true;
    else if (yaml) { if (["---", "..."].includes(stripped)) yaml = false; }
    else if (fence) {
      if (
        new RegExp("^ {0,3}" + fence[0] + "{" + fence.length + ",}\\s*$").test(
          line,
        )
      ) {
        if (managed) {
          const block = text.slice(start, offset + line.length),
            m = block.match(
              /^```\{\.(presentation-image-layout|image-layout)\}\r?\n([\s\S]*?)^```[ \t]*\r?$/m,
            );
          if (!m) {
            throw Error(
              "Use a standard ```{.image-layout} fence for source editing.",
            );
          }
          result.push([m[1], start, start + m[0].length, m[2]]);
        }
        fence = "";
      }
    } else if (placed !== null) {
      if (/^ {0,3}:{3,}[ \t]*$/.test(bare)) {
        result.push(["placed-image", placed, offset + bare.length, ""]);
        placed = null;
      } else if (stripped) {
        throw Error("placed-image blocks must be empty for source editing.");
      }
    } else if (comment) { if (line.includes("-->")) comment = false; }
    else if (line.includes("<!--")) comment = !line.includes("-->");
    else {
      const div = bare.match(/^ {0,3}:{3,}[ \t]*\{([^\n]*)\}[ \t]*$/);
      if (div) {
        let attrs: string[] = [];
        try {
          attrs = tokens(div[1]);
        } catch {}
        if (
          attrs.includes(".placed-image") ||
          ((attrs.includes(".image") || attrs.includes(".video")) &&
            attrs.includes("position=free"))
        ) placed = offset;
      }
      const opening = line.match(/^ {0,3}(`{3,}|~{3,})(.*)/);
      if (opening) {
        fence = opening[1];
        start = offset;
        managed = /\.(?:presentation-image-layout|image-layout)(?:[ }]|$)/.test(
          opening[2],
        );
      }
    }
    offset += line.length;
    n++;
  }
  if (placed !== null) throw Error("Unclosed placed-image block.");
  if (fence && managed) throw Error("Unclosed image-layout block.");
  return result;
}
function cleanItems(items: any, slide: string): any[] {
  if (!Array.isArray(items) || items.length > 2000) {
    throw Error("Invalid image list.");
  }
  return items.map((item) => {
    const asset = item?.asset || "";
    if (
      typeof asset !== "string" ||
      !["global:", "lesson:", slide + ":"].some((x) => asset.startsWith(x))
    ) throw Error("Invalid image reference.");
    const nums = Object.fromEntries(
      ["x", "y", "w", "h"].map((k) => [k, item[k]]),
    );
    if (
      Object.values(nums).some((v) =>
        typeof v !== "number" || !Number.isFinite(v)
      )
    ) throw Error("Invalid image coordinates.");
    if (
      !(nums.w > 0 && nums.w <= 1 && nums.h > 0 && nums.h <= 1 &&
        nums.x >= -1 && nums.x <= 1 && nums.y >= -1 && nums.y <= 1)
    ) throw Error("Images must remain inside the content area.");
    const layer = item.layer ?? 1,
      rotation = item.rotation ?? 0,
      transparency = item.transparency ?? 0;
    if (!Number.isInteger(layer) || layer < 0 || layer > 1000000) {
      throw Error("Invalid image layer.");
    }
    if (typeof rotation !== "number" || !Number.isFinite(rotation)) {
      throw Error("Invalid image rotation.");
    }
    if (
      typeof transparency !== "number" || !Number.isFinite(transparency) ||
      transparency < 0 || transparency > 100
    ) throw Error("Invalid image transparency.");
    const short = asset.slice(asset.indexOf(":") + 1),
      reference = item.reference ?? short;
    if (reference !== asset && reference !== short) {
      throw Error("Invalid source reference.");
    }
    const result: any = {
      asset,
      reference,
      transparency,
      layer,
      rotation: ((rotation + 180) % 360 + 360) % 360 - 180,
      ...nums,
    };
    if ("src" in item) {
      const src = item.src;
      if (
        typeof src !== "string" || !src || src.startsWith("//") ||
        (/^[a-zA-Z][\w+.-]*:/.test(src) && !/^https?:\/\//.test(src))
      ) throw Error("Invalid media source.");
      result.src = src;
    }
    if ("height" in item) result.height = nums.h * 100;
    return result;
  });
}
export async function revision(bytes: Uint8Array) {
  return await digest(bytes, "SHA-1");
}
export async function saveLayout(
  path: string,
  expected: string,
  index: number,
  slide: string,
  items: any,
  count: number,
) {
  const raw = await Deno.readFile(path);
  if (await revision(raw) !== expected) {
    throw Error(
      "Source changed since rendering. Render and reload before saving.",
    );
  }
  let text = new TextDecoder("utf-8", { fatal: true }).decode(raw);
  const hs = headings(text);
  if (hs.length !== count) {
    throw Error(
      "This heading syntax cannot be mapped safely. Use ATX headings (# / ##) and render again.",
    );
  }
  if (
    typeof slide !== "string" || !/^[-\p{L}\p{N}_: .]+$/u.test(slide) ||
    slide.includes(" ")
  ) throw Error("Invalid slide ID.");
  const clean = cleanItems(items, slide),
    newline = text.includes("\r\n") ? "\r\n" : "\n";
  let newId = slide, insertion = 0;
  if (index === 0) {
    if (slide !== "title-slide") {
      throw Error("Only the title slide can use source index zero.");
    }
    insertion = hs[0]?.[0] ?? text.length;
  } else {
    if (!Number.isInteger(index) || index < 1 || index > hs.length) {
      throw Error("Source heading not found.");
    }
    let [start, end, line] = hs[index - 1];
    const attr = line.trimEnd().match(/\{([^{}]*)\}\s*$/),
      explicit = attr?.[1].match(/(?:^|\s)#([^\s}]+)/);
    if (explicit) {
      if (explicit[1] !== slide) {
        throw Error("Slide ID no longer matches the source.");
      }
    } else {
      newId = "slide-" + crypto.randomUUID().replaceAll("-", "").slice(0, 10);
      let updated;
      if (attr) {
        updated = line.slice(0, attr.index! + 1) + "#" + newId + " " +
          line.slice(attr.index! + 1);
      } else {
        const opening = line.trimEnd().match(/^( {0,3}#{1,6})(.*)$/)!;
        updated = opening[1] + opening[2].replace(/[ \t]+#+[ \t]*$/, "") +
          " {#" + newId + "}" + newline;
      }
      text = text.slice(0, start) + updated + text.slice(end);
      end = start + updated.length;
    }
    insertion = end;
  }
  for (const item of clean) {
    if (item.asset.startsWith(slide + ":")) {
      item.asset = newId + item.asset.slice(slide.length);
      if (item.reference.startsWith(slide + ":")) {
        item.reference = newId + item.reference.slice(slide.length);
      }
    }
  }
  const labels: Record<string, Record<string, string>> = {};
  for (const line of lines(text)) {
    if (!/^ {0,3}:{3,}\s*\{/.test(line)) continue;
    let ts: string[];
    try {
      ts = tokens(line.slice(line.indexOf("{") + 1, line.lastIndexOf("}")));
    } catch {
      continue;
    }
    const attrs = Object.fromEntries(
      ts.filter((t) => t.includes("=")).map(
        (t) => [t.slice(0, t.indexOf("=")), t.slice(t.indexOf("=") + 1)],
      ),
    );
    if (attrs.position === "free" && attrs.src) {
      labels[unescapeHtml(attrs.src)] = Object.fromEntries(
        ["title", "alt"].filter((k) => k in attrs).map(
          (k) => [k, unescapeHtml(attrs[k])],
        ),
      );
    }
  }
  const number = (v: number) => v.toFixed(2).replace(/\.?0+$/, "") || "0";
  const attribute = (k: string, v: any) =>
    k + '="' +
    escapeHtml(v).replaceAll("\n", "&#10;").replaceAll("\r", "&#13;") + '"';
  const entries = clean.map((item) => {
    const ref = item.reference;
    const src = item.src ||
        (/^(?:global:|lesson:)?file:/.test(ref)
          ? ref.replace(/^(?:global:|lesson:)?file:/, "")
          : null),
      suffix = src ? "%" : "";
    const kind = src && /\.(mp4|webm|m4v)(?:[?#]|$)/i.test(src)
      ? "video"
      : "image";
    const entry = src
      ? [attribute("src", src), attribute("position", "free")]
      : [attribute("asset", ref)];
    if (src) {
      for (const [k, v] of Object.entries(labels[src] || {})) {
        entry.push(attribute(k, v));
      }
    }
    entry.push(
      attribute("x", number(item.x * 100) + suffix),
      attribute("y", number(item.y * 100) + suffix),
    );
    if (Math.abs(item.w - .25) > .000001) {
      entry.push(attribute("width", number(item.w * 100) + suffix));
    }
    if ("height" in item) {
      entry.push(attribute("height", number(item.height) + suffix));
    }
    if (item.layer !== 1) entry.push(attribute("layer", item.layer));
    if (Math.abs(item.rotation) > .005) {
      entry.push(attribute("rotation", number(item.rotation)));
    }
    if (item.transparency !== 0) {
      entry.push(attribute("transparency", number(item.transparency)));
    }
    return "::: {." + (src ? kind : "placed-image") + " " + entry.join(" ") +
      "}" + newline + ":::";
  });
  const block = entries.join(newline + newline),
    mapped = headings(text),
    lower = index ? mapped[index - 1][1] : 0,
    upper = index
      ? (mapped.slice(index).find((h) => /^#{1,2}\s/.test(h[2]))?.[0] ??
        text.length)
      : (mapped[0]?.[0] ?? text.length);
  const matches = layoutBlocks(text).filter(([kind, start, , payload]) =>
    kind === "presentation-image-layout"
      ? JSON.parse(payload).slide === slide
      : start >= lower && start < upper
  );
  const legacy = matches.filter((m) => m[0] !== "placed-image");
  if (legacy.length > 1 || (legacy.length && matches.length > 1)) {
    throw Error("Duplicate image layout blocks for this slide.");
  }
  if (matches.length) {
    const remaining = [...entries],
      replacements: [number, number, string][] = [];
    matches.forEach(([kind, start, end], i) => {
      if (kind === "placed-image") {
        let value = remaining.shift() || "";
        if (i === matches.length - 1 && remaining.length) {
          value += newline + newline + remaining.join(newline + newline);
        }
        replacements.push([start, end, value]);
      } else if (start >= lower && start < upper) {
        replacements.push([start, end, block]);
      } else {replacements.push([start, end, ""], [
          insertion,
          insertion,
          newline + block + newline,
        ]);}
    });
    for (
      const [start, end, value] of replacements.sort((a, b) =>
        b[0] - a[0] || b[1] - a[1]
      )
    ) text = text.slice(0, start) + value + text.slice(end);
  } else if (block) {
    text = text.slice(0, insertion) + newline + block + newline +
      text.slice(insertion);
  }
  const backupDir = join(dirname(path), ".quarto", "presentation", "layout-backups");
  await Deno.mkdir(backupDir, { recursive: true });
  await Deno.writeFile(join(backupDir, basename(path) + ".layout-backup"), raw);
  const tmp = join(dirname(path), "." + basename(path) + ".layout-tmp");
  try {
    await Deno.writeTextFile(tmp, text);
    if (await revision(await Deno.readFile(path)) !== expected) {
      throw Error("Source changed while saving. Nothing was overwritten.");
    }
    await Deno.rename(tmp, path);
  } finally {
    try {
      await Deno.remove(tmp);
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) throw e;
    }
  }
  return {
    revision: await revision(new TextEncoder().encode(text)),
    slide: newId,
    images: clean,
  };
}
export async function sourceMetadata(page: string) {
  const text = await Deno.readTextFile(page),
    m = text.match(
      /<template id="presentation-source-layout">([\s\S]*?)<\/template>/,
    );
  if (!m) throw Error("Render this presentation before saving to source.");
  return JSON.parse(unescapeHtml(m[1]));
}
export async function resolveSource(
  root: string,
  output: string,
  page: string,
) {
  const meta = await sourceMetadata(page);
  const path = await Deno.realPath(
    resolve(root, dirname(relative(output, page)), meta.file),
  );
  if (
    !inside(root, path) || extname(path) !== ".qmd" ||
    (output !== root && inside(output, path))
  ) throw Error("Source is outside this project.");
  return { path, meta };
}
export async function handle(
  root: string,
  output: string,
  page: string,
  data: any,
  _port: number,
) {
  const { path, meta } = await resolveSource(root, output, page);
  return await saveLayout(
    path,
    data.revision,
    data.index,
    data.slide,
    data.images,
    meta.headings,
  );
}
