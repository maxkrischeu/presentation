import { PDFDocument } from "./vendor/pdf-lib.mjs";
export { PDFDocument };
export const width = 297 / 25.4 * 72,
  height = 210 / 25.4 * 72,
  margin = 10 / 25.4 * 72;
export function fit(w: number, h: number) {
  const scale = Math.min((width - 2 * margin) / w, (height - 2 * margin) / h);
  return {
    x: (width - w * scale) / 2,
    y: (height - h * scale) / 2,
    width: w * scale,
    height: h * scale,
  };
}
export async function landscape(source: Uint8Array, title: string) {
  const result = await PDFDocument.create(),
    input = await PDFDocument.load(source);
  for (const slide of await result.embedPdf(input, input.getPageIndices())) {
    result.addPage([width, height]).drawPage(
      slide,
      fit(slide.width, slide.height),
    );
  }
  if (title) result.setTitle(title);
  return result;
}
