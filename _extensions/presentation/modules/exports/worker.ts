import { browserPath } from "./browser.ts";
import { openPage } from "./cdp.ts";
import { fit, height, landscape, PDFDocument, width } from "./pdf-layout.ts";
import { preparePage } from "./prepare-page.js";

export async function exportPdf({ url, destination, kind, snapshot, options }: {
  url: string;
  destination: string;
  kind: string;
  snapshot: any;
  options: any;
}) {
  if (kind === "chalkboard") {
    if (!snapshot.modules.drawing.drawings.boards.length) {
      throw Error("No non-empty chalkboards to export.");
    }
    const pdf = await PDFDocument.create();
    for (const board of snapshot.modules.drawing.drawings.boards) {
      const png = await pdf.embedPng(board.png);
      pdf.addPage([width, height]).drawImage(png, fit(png.width, png.height));
    }
    await Deno.writeFile(destination, await pdf.save());
    return;
  }
  const page = await openPage(await browserPath());
  try {
    if (options.content === "current") {
      await page.init(
        "window.__presentationSession=" + JSON.stringify(snapshot) + ";",
      );
    }
    const target = new URL(url);
    target.searchParams.set("print-pdf", "");
    await page.goto(target.href);
    await page.evaluate(
      "(" + preparePage.toString() + ")(" +
        JSON.stringify({ snapshot, options }) + ")",
    );
    const pdf = await landscape(
      await page.pdf(),
      await page.evaluate("document.title"),
    );
    await Deno.writeFile(destination, await pdf.save());
  } finally {
    await page.close();
  }
}
