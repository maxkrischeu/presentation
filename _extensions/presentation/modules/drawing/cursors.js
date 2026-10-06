/* Original vector controls and cursors, matching the presentation's line icons. */
Presentation.drawingIcons = {
  pen: '<path d="m4 20 1.5-5.5L16 4a2.8 2.8 0 0 1 4 4L9.5 18.5 4 20Z M14 6l4 4 M5.5 14.5l4 4"/>',
  eraser: '<path d="m4 13 9-9a2 2 0 0 1 3 0l4 4a2 2 0 0 1 0 3l-9 9H7l-3-3a2.8 2.8 0 0 1 0-4Z M9 8l7 7 M11 20h9"/>',
};
(() => {
  const svg = (size, body) => 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`
  );
  const colors = {black:'#596579',white:'#ffffff',blue:'#3973bc',red:'#e44b55',green:'#54a968',orange:'#ed963b',purple:'#9368c4',yellow:'#e5bd32'};
  const cursors = {};
  for (const [name,color] of Object.entries(colors)) {
    const body = `<g transform="rotate(90 16 16)" stroke-linejoin="round" stroke-linecap="round"><path d="m3 29 2-8L22 4a3.5 3.5 0 0 1 5 5L10 26 3 29Z" fill="white" stroke="white" stroke-width="4"/><path d="m3 29 2-8L22 4a3.5 3.5 0 0 1 5 5L10 26 3 29Z" fill="white" stroke="#596579" stroke-width="1.5"/><path d="m8 23 15-15" stroke="${color}" stroke-width="3"/><path d="m5 21 5 5m10-20 5 5" fill="none" stroke="#596579" stroke-width="1.5"/><path d="m3 29 2-5 3 3Z" fill="${color}"/></g>`;
    for (const prefix of ['boardmarker','chalk']) cursors[`${prefix}-${name}.png`] = {url:svg(32,body),x:3,y:3};
  }
  const eraser = svg(44, `<circle cx="22" cy="22" r="20" fill="#ffffff" fill-opacity=".12" stroke="white" stroke-width="3"/><circle cx="22" cy="22" r="20" fill="none" stroke="#596579" stroke-width="1.3"/><g transform="translate(10 10)" fill="#ffffff" stroke="#596579" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${Presentation.drawingIcons.eraser}</g>`);
  // Both tools use the cursor centre as the input point.
  cursors['sponge.png'] = {url:eraser,x:22,y:22};
  cursors['stroke-sponge.png'] = {url:eraser,x:22,y:22};
  Presentation.drawingCursors = cursors;
})();
