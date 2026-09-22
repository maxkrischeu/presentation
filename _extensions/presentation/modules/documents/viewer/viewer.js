import { getDocument, GlobalWorkerOptions } from './pdf.mjs';
GlobalWorkerOptions.workerSrc = new URL('./pdf.worker.mjs', import.meta.url).href;
const params = new URLSearchParams(location.search);
const viewport = document.getElementById('viewport');
const pages = document.getElementById('pages');
const status = document.getElementById('status');
const german = params.get('lang') === 'de';
document.documentElement.lang = german ? 'de' : 'en';
document.title = params.get('title') || 'PDF';
viewport.setAttribute('aria-label', document.title);
const records = [];
let zoom = 1, fit = 1, widest = 1, timer, generation = 0;
let gestureStart = null, touchStart = null;
status.textContent = params.get('loading') || 'Loading PDF …';

function scheduleRender() {
  clearTimeout(timer);
  timer = setTimeout(renderVisible, 100);
}
function sizePages() {
  pages.style.width = `${Math.max(viewport.clientWidth, widest * fit * zoom + 24)}px`;
  for (const record of records) {
    record.node.style.width = `${record.width * fit * zoom}px`;
    record.node.style.height = `${record.height * fit * zoom}px`;
  }
  viewport.dataset.zoom = String(zoom);
}
function setZoom(next, x = viewport.clientWidth / 2, y = viewport.clientHeight / 2) {
  next = Math.max(0.5, Math.min(5, next));
  if (!records.length || next === zoom) return;
  const oldWidth = pages.offsetWidth;
  const oldHeight = pages.offsetHeight;
  const anchorX = (viewport.scrollLeft + x) / oldWidth;
  const anchorY = (viewport.scrollTop + y) / oldHeight;
  zoom = next;
  generation++;
  sizePages();
  viewport.scrollLeft = anchorX * pages.offsetWidth - x;
  viewport.scrollTop = anchorY * pages.offsetHeight - y;
  scheduleRender();
}
async function renderVisible() {
  const version = generation;
  const bounds = viewport.getBoundingClientRect();
  for (const record of records) {
    const rect = record.node.getBoundingClientRect();
    if (rect.bottom < bounds.top - bounds.height || rect.top > bounds.bottom + bounds.height) {
      record.task?.cancel();
      if (record.canvas) { record.canvas.width = 0; record.canvas.height = 0; record.canvas.remove(); record.canvas = null; }
      record.rendered = 0;
      continue;
    }
    const scale = fit * zoom;
    if (record.rendered === scale || record.pending === scale) continue;
    record.task?.cancel();
    record.pending = scale;
    const canvas = document.createElement('canvas');
    const view = record.page.getViewport({ scale });
    // Bound backing-store memory even at large zoom levels.
    const density = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(8000000 / (view.width * view.height)));
    canvas.width = Math.ceil(view.width * density);
    canvas.height = Math.ceil(view.height * density);
    const task = record.page.render({ canvasContext: canvas.getContext('2d'), viewport: view, transform: [density, 0, 0, density, 0, 0] });
    record.task = task;
    try {
      await task.promise;
      if (version !== generation) { canvas.width = 0; scheduleRender(); return; }
      record.canvas?.remove();
      record.canvas = canvas;
      record.node.append(canvas);
      record.rendered = scale;
    } catch (error) {
      if (error.name !== 'RenderingCancelledException') console.error(error);
    } finally {
      if (record.task === task) { record.task = null; record.pending = null; }
    }
  }
}
viewport.addEventListener('scroll', scheduleRender, { passive: true });
viewport.addEventListener('wheel', event => {
  if (!event.ctrlKey || gestureStart !== null || touchStart) return;
  event.preventDefault();
  setZoom(zoom * Math.exp(-event.deltaY * 0.008), event.clientX, event.clientY);
}, { passive: false });
// Safari trackpad pinch uses GestureEvent; Chromium uses ctrl+wheel.
viewport.addEventListener('gesturestart', event => {
  event.preventDefault();
  if (!touchStart) gestureStart = zoom;
}, { passive: false });
viewport.addEventListener('gesturechange', event => {
  event.preventDefault();
  if (gestureStart !== null && !touchStart) setZoom(gestureStart * event.scale, event.clientX, event.clientY);
}, { passive: false });
viewport.addEventListener('gestureend', event => { event.preventDefault(); gestureStart = null; }, { passive: false });
const distance = touches => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
viewport.addEventListener('touchstart', event => {
  if (event.touches.length !== 2) return;
  event.preventDefault();
  touchStart = { zoom, distance: distance(event.touches) };
  gestureStart = null;
}, { passive: false });
viewport.addEventListener('touchmove', event => {
  if (!touchStart || event.touches.length !== 2) return;
  event.preventDefault();
  const [a, b] = event.touches;
  setZoom(touchStart.zoom * distance(event.touches) / Math.max(1, touchStart.distance), (a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
}, { passive: false });
for (const type of ['touchend', 'touchcancel']) viewport.addEventListener(type, () => { touchStart = null; });
viewport.addEventListener('keydown', event => {
  if (['+', '=', '-', '0'].includes(event.key)) {
    event.preventDefault();
    setZoom(event.key === '0' ? 1 : zoom * (event.key === '-' ? 1 / 1.2 : 1.2));
  }
});
new ResizeObserver(() => {
  if (!records.length) return;
  fit = Math.max(1, viewport.clientWidth - 24) / widest;
  generation++;
  sizePages();
  scheduleRender();
}).observe(viewport);

try {
  const url = new URL(params.get('file'));
  if (!['http:', 'https:', 'blob:', 'file:'].includes(url.protocol)) throw new Error('Unsupported PDF URL');
  const pdf = await getDocument({ url: url.href,
    cMapUrl: new URL('./', import.meta.url).href, cMapPacked: true,
    standardFontDataUrl: new URL('./', import.meta.url).href,
    wasmUrl: new URL('./', import.meta.url).href,
    isEvalSupported: false,
  }).promise;
  for (let index = 1; index <= pdf.numPages; index++) {
    const page = await pdf.getPage(index);
    const view = page.getViewport({ scale: 1 });
    const node = document.createElement('div');
    node.className = 'page';
    node.setAttribute('role', 'img');
    node.setAttribute('aria-label', `${params.get('page') || 'Page'} ${index}`);
    pages.append(node);
    records.push({ page, node, width: view.width, height: view.height });
    widest = Math.max(widest, view.width);
  }
  fit = Math.max(1, viewport.clientWidth - 24) / widest;
  sizePages();
  status.textContent = '';
  await renderVisible();
  viewport.dataset.ready = 'true';
} catch (error) {
  console.error('PDF preview:', error);
  status.textContent = params.get('error') || 'Could not load PDF. Please use “Open separately”.';
  viewport.dataset.error = 'true';
}
