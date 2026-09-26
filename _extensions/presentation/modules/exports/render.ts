// Explicit CLI export; normal rendering never creates PDFs automatically.
import { resolve, toFileUrl } from "stdlib/path";
import { exportPdf } from "./worker.ts";
import { exportInputs } from "./inputs.ts";
const files = await exportInputs();
for (const file of files.filter((file) => /\.html?$/i.test(file))) {
  if (
    !(await Deno.readTextFile(file)).includes("presentation-frame-template")
  ) continue;
  const destination = file.replace(/\.html?$/i, ".pdf");
  try {
    await exportPdf({
      url: toFileUrl(resolve(file)).href,
      destination: destination + ".tmp",
      kind: "slides",
      snapshot: {},
      options: { images: true },
    });
    await Deno.rename(destination + ".tmp", destination);
    console.log("PDF: " + destination + " (A4 landscape)");
  } finally {
    await Deno.remove(destination + ".tmp").catch(() => {});
  }
}
