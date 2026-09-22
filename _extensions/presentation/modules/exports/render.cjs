// Quarto post-render: preserve selectable text and vectors, center 16:9 on A4.
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PRESENTATION_PLAYWRIGHT || 'playwright');
const { landscape } = require('./pdf-layout.cjs');
const { exportInputs } = require('./inputs.cjs');

(async () => {
  const files = await exportInputs();
  const htmlFiles = files.filter(file => /\.html?$/i.test(file));
  if (!htmlFiles.length) return;
  const browser = await chromium.launch({executablePath:process.env.PRESENTATION_CHROMIUM || undefined});
  try {
    for (const file of htmlFiles) {
      const html = await fs.readFile(file, 'utf8');
      if (!html.includes('presentation-frame-template')) continue;
      const page = await browser.newPage();
      try {
        const url = pathToFileURL(path.resolve(file));
        url.search = '?print-pdf';
        await page.goto(url.href, {waitUntil:'networkidle'});
        await page.waitForFunction(() => window.Reveal?.isReady() && document.querySelector('.pdf-page'));
        await page.evaluate(async () => {
          await document.fonts.ready;
          await window.Presentation?.ready;
          await Promise.all(Array.from(document.images, image => image.decode().catch(() => {})));
        });
        const source = await page.pdf({printBackground:true, preferCSSPageSize:true});
        const pdf = await landscape(source, await page.title());
        const destination = file.replace(/\.html?$/i, '.pdf');
        // Replace only after a successful export, so interrupted builds keep the prior PDF.
        await fs.writeFile(destination + '.tmp', await pdf.save());
        await fs.rename(destination + '.tmp', destination);
        console.log(`PDF: ${destination} (A4 quer, ${pdf.getPageCount()} Folien)`);
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error('PDF-Export fehlgeschlagen:', error); process.exitCode = 1; });
