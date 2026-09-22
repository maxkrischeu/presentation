/* Black letterbox outside Reveal's own scaled slide rectangle. No slide
   transforms are replaced, and the frame/dock retain their usual coordinates. */
Presentation.factories.viewport = function (context) {
  const { deck } = context;
  const mask = document.createElement("div");
  mask.className = "presentation-letterbox";
  mask.setAttribute("aria-hidden", "true");
  mask.hidden = true;
  document.body.append(mask);
  const place = () => {
    mask.hidden = document.documentElement.classList.contains("print-pdf");
    if (mask.hidden) return;
    // Never measure the animated overview grid: its temporary bounds can leave
    // the canvas clipped to a thumbnail after returning to a slide.
    const viewport = deck.getRevealElement().getBoundingClientRect();
    const ratio = deck.getConfig().width / deck.getConfig().height;
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
  };
  deck.on("resize", place);
  deck.on("overviewshown", place);
  deck.on("overviewhidden", () => requestAnimationFrame(place));
  window.addEventListener("resize", () => requestAnimationFrame(place));
  place();
  requestAnimationFrame(place);
};
