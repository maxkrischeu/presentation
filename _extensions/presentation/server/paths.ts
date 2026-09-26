// Shared filesystem helpers using only Quarto's bundled standard library.
import { isAbsolute, relative, resolve } from "stdlib/path";
export { isAbsolute, relative, resolve };
export function inside(root: string, path: string): boolean {
  const rel = relative(resolve(root), resolve(path));
  return rel === "" ||
    (!isAbsolute(rel) && rel !== ".." && !rel.startsWith("../") &&
      !rel.startsWith("..\\"));
}
export async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return false;
    throw e;
  }
}
export async function digest(
  bytes: Uint8Array,
  algorithm = "SHA-256",
): Promise<string> {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest(algorithm, Uint8Array.from(bytes).buffer),
    ),
  ].map(
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
}
export async function envFiles(
  fileKey: string,
  listKey: string,
): Promise<string[]> {
  const file = Deno.env.get(fileKey);
  return (file ? await Deno.readTextFile(file) : Deno.env.get(listKey) || "")
    .split(/\r?\n/).filter(Boolean);
}
