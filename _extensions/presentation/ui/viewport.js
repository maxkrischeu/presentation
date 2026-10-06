/* Black letterbox outside Reveal's own scaled slide rectangle. No slide
   transforms are replaced, and the frame/dock retain their usual coordinates. */
Presentation.factories.viewport = function (context) {
  const { deck } = context;
  const mask = document.createElement("div");
  mask.className = "presentation-letterbox";
  mask.setAttribute("aria-hidden", "true");
  mask.hidden = true;
  // Separate bars avoid a huge box-shadow layer during Safari fullscreen compositing.
  const bars = Array.from({length: 4}, () => {
    const bar = document.createElement("div");
    bar.className = "presentation-letterbox-bar";
    mask.append(bar);
    return bar;
  });
  document.body.append(mask);
  let lastGeometry = "";
  const place = () => {
    mask.hidden = document.documentElement.classList.contains("print-pdf");
    if (mask.hidden) return;
    // Never measure the animated overview grid: its temporary bounds can leave
    // the canvas clipped to a thumbnail after returning to a slide.
    const viewport = deck.getRevealElement().getBoundingClientRect();
    const ratio = deck.getConfig().width / deck.getConfig().height;
    if (![viewport.width, viewport.height, ratio].every(Number.isFinite) ||
        viewport.width <= 0 || viewport.height <= 0 || ratio <= 0) {
      mask.hidden = true;
      return;
    }
    const width = Math.min(viewport.width, viewport.height * ratio);
    const height = width / ratio;
    const left = viewport.left + (viewport.width - width) / 2;
    const top = viewport.top + (viewport.height - height) / 2;
    const rect = {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
    };
    for (const [name, value] of Object.entries({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    })) {
      document.documentElement.style.setProperty(
        `--presentation-stage-${name}`,
        `${value}px`,
      );
    }
    // Clip the plugin's viewport-sized canvases without changing its drawing
    // coordinates. Clipping also excludes pointer input in the black bars.
    const right = Math.max(0, window.innerWidth - rect.right);
    const bottom = Math.max(0, window.innerHeight - rect.bottom);
    for (const overlay of document.querySelectorAll(
      "#chalkboard, #notescanvas",
    )) {
      overlay.style.clipPath = `inset(${Math.max(0, rect.top)}px ${right}px ${bottom}px ${Math.max(0, rect.left)}px)`;
      overlay.style.setProperty("--presentation-board-left", `${rect.left}px`);
      overlay.style.setProperty("--presentation-board-right", `${right}px`);
    }
    Object.assign(mask.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
    const edges = [
      [0, 0, innerWidth, Math.max(0, top)],
      [0, rect.bottom, innerWidth, bottom],
      [0, top, Math.max(0, left), height],
      [rect.right, top, right, height],
    ];
    bars.forEach((bar, i) => {
      const [x, y, w, h] = edges[i];
      Object.assign(bar.style, {left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`});
    });
    const geometry = [left, top, width, height, innerWidth, innerHeight].join(",");
    if (geometry !== lastGeometry) {
      lastGeometry = geometry;
      window.dispatchEvent(new Event("presentationviewportchange"));
    }
  };
  // Coalesce events and let Reveal finish its layout before placing fixed UI.
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      deck.layout();
      place();
    });
  };
  let settleTimers = [];
  const settle = () => {
    settleTimers.forEach(clearTimeout);
    schedule();
    // Native fullscreen transitions can complete after their initial DOM event.
    settleTimers = [100, 300, 700].map(delay => setTimeout(schedule, delay));
  };
  const observer = new ResizeObserver(schedule);
  observer.observe(deck.getRevealElement());
  deck.on("resize", place);
  deck.on("overviewshown", place);
  deck.on("overviewhidden", () => requestAnimationFrame(place));
  window.addEventListener("resize", schedule);
  window.addEventListener("scroll", schedule, {passive: true});
  window.visualViewport?.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("scroll", schedule);
  for (const name of ["fullscreenchange", "webkitfullscreenchange"])
    document.addEventListener(name, settle);
  window.addEventListener("pageshow", settle);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) settle();
  });
  place();
  schedule();
};
