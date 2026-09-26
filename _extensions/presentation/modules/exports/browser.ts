// Use Quarto's public browser discovery/installer; no private installation paths.
import { join } from "stdlib/path";
import { exists } from "../../server/paths.ts";

async function quarto(args: string[], timeout: number) {
  const child = new Deno.Command("quarto", {
    args,
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const timer = setTimeout(() => {
    try {
      child.kill("SIGTERM");
    } catch {}
  }, timeout);
  try {
    const result = await child.output();
    if (!result.success) {
      throw Error(
        new TextDecoder().decode(result.stderr).slice(-2000) ||
          "Quarto browser setup failed.",
      );
    }
  } finally {
    clearTimeout(timer);
  }
}

let pending: Promise<string> | undefined;
export function browserPath(): Promise<string> {
  return pending ??= discoverBrowser().catch((error) => {
    pending = undefined;
    throw error;
  });
}
export async function discoverBrowser(
  run = quarto,
  override = Deno.env.get("PRESENTATION_CHROMIUM") ||
    Deno.env.get("QUARTO_CHROMIUM"),
) {
  if (override) {
    if (!await exists(override)) {
      throw Error("Configured PDF browser does not exist: " + override);
    }
    return override;
  }
  const temp = await Deno.makeTempDir({
    prefix: "presentation-browser-check-",
  });
  try {
    const report = join(temp, "check.json");
    const detect = async () => {
      await run(["check", "install", "--output", report], 120000);
      const info = JSON.parse(await Deno.readTextFile(report));
      return typeof info.chrome?.path === "string" &&
          await exists(info.chrome.path)
        ? info.chrome.path as string
        : undefined;
    };
    let path = await detect();
    if (!path) {
      console.log(
        "Presentation: preparing PDF export. Quarto is downloading its headless browser (first use)…",
      );
      await run(["install", "chrome-headless-shell", "--no-prompt"], 600000);
      path = await detect();
    }
    if (!path) {
      throw Error("Quarto could not locate a PDF browser after installation.");
    }
    return path;
  } finally {
    await Deno.remove(temp, { recursive: true });
  }
}
