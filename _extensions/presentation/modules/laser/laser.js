/* Temporary laser ink. No storage, PDF output or Chalkboard state is touched. */
Presentation.factories.laser = function (context) {
  const { deck } = context;
  const canvas = document.createElement("canvas");
  canvas.className = "presentation-laser-canvas";
  canvas.hidden = true;
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.preventSwipe = "true";
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  let active = false,
    strokes = [],
    stroke = null,
    cursor = null,
    pointer = null,
    frame = 0,
    color = "#ef3340",
    rect,
    releasedAt = null;
  const controls = document.createElement("div");
  controls.className = "presentation-laser-controls";
  controls.hidden = true;
  const icons = {
    colors:
      '<circle cx="8" cy="8" r="4" fill="#ef3340"/><circle cx="16" cy="8" r="4" fill="#14abd5"/><circle cx="12" cy="16" r="4" fill="#7cb142"/>',
    clear:
      '<path d="m4 14 9-10 7 7-9 10H7Z M10 8l7 7 M17 16l5 5 M22 16l-5 5"/>',
    done: '<path d="m4 12 5 5L20 6"/>',
  };
  for (const [action, label] of [
    ["colors", Presentation.t("Laser Color")],
    ["clear", Presentation.t("Clear Laser Trails")],
    ["done", Presentation.t("Done Laser Pointer")],
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.laser = action;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[action]}</svg>`;
    controls.append(button);
  }
  const palette = document.createElement("div");
  palette.className = "presentation-dock-palette";
  palette.hidden = true;
  palette.setAttribute("aria-label", Presentation.t("Laser Color"));
  for (const [name, value] of [
    [Presentation.t("Red"), "#ef3340"],
    [Presentation.t("Blue"), "#14abd5"],
    [Presentation.t("Green"), "#65bf35"],
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", name);
    button.title = name;
    const dot = document.createElement("span");
    dot.style.background = value;
    button.append(dot);
    button.onclick = () => {
      color = value;
      palette.hidden = true;
      sync();
      request();
    };
    palette.append(button);
  }
  controls.append(palette);
  const sync = () => {
    controls.hidden = !active;
    controls
      .querySelector("[data-laser=colors]")
      .setAttribute("aria-expanded", String(!palette.hidden));
    context.changed();
  };
  function layout() {
    const stage = deck.getRevealElement().getBoundingClientRect(),
      cfg = deck.getConfig(),
      css = getComputedStyle(document.documentElement);
    const scale = Math.min(stage.width / cfg.width, stage.height / cfg.height),
      left = stage.left + (stage.width - cfg.width * scale) / 2,
      top = stage.top + (stage.height - cfg.height * scale) / 2;
    const side = parseFloat(css.getPropertyValue("--presentation-side")) || 36,
      head = parseFloat(css.getPropertyValue("--presentation-header")) || 58,
      foot = parseFloat(css.getPropertyValue("--presentation-footer")) || 50;
    const footerTop =
      deck
        .getCurrentSlide()
        ?.querySelector(":scope > .presentation-footer")
        ?.getBoundingClientRect().top ?? top + (cfg.height - foot) * scale;
    rect = {
      left: left + side * scale,
      top: top + head * scale,
      width: (cfg.width - 2 * side) * scale,
      height: footerTop - (top + head * scale),
    };
    Object.assign(canvas.style, {
      left: rect.left + "px",
      top: rect.top + "px",
      width: rect.width + "px",
      height: rect.height + "px",
    });
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    request();
  }
  const point = (e) => ({
    x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
  });
  function paint(now) {
    frame = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!active) return;
    if (releasedAt !== null && now - releasedAt >= 2500) strokes = [];
    const sx = canvas.width,
      sy = canvas.height,
      unit = sx / (deck.getConfig().width - 72);
    ctx.lineWidth = 3 * unit;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowBlur = 7 * unit;
    for (const s of strokes) {
      ctx.globalAlpha =
        releasedAt === null
          ? 1
          : Math.max(0, 1 - Math.max(0, now - releasedAt - 1000) / 1500);
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.beginPath();
      s.points.forEach((p, i) =>
        i ? ctx.lineTo(p.x * sx, p.y * sy) : ctx.moveTo(p.x * sx, p.y * sy),
      );
      if (s.points.length === 1) {
        ctx.arc(
          s.points[0].x * sx,
          s.points[0].y * sy,
          1.5 * unit,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      } else ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (cursor) {
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.arc(cursor.x * sx, cursor.y * sy, 4 * unit, 0, Math.PI * 2);
      ctx.fill();
    }
    if (strokes.length && releasedAt !== null) request();
  }
  function request() {
    if (active && !frame) frame = requestAnimationFrame(paint);
  }
  function finish() {
    if (stroke) releasedAt = performance.now();
    stroke = null;
    if (pointer !== null && canvas.hasPointerCapture(pointer))
      canvas.releasePointerCapture(pointer);
    pointer = null;
    request();
  }
  function clear() {
    finish();
    strokes = [];
    releasedAt = null;
    cursor = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  function stop() {
    active = false;
    clear();
    cancelAnimationFrame(frame);
    frame = 0;
    canvas.hidden = true;
    palette.hidden = true;
    sync();
  }
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || pointer !== null) return;
    e.preventDefault();
    pointer = e.pointerId;
    canvas.setPointerCapture(pointer);
    cursor = point(e);
    if (releasedAt !== null && performance.now() - releasedAt >= 2500)
      strokes = [];
    releasedAt = null;
    stroke = { color, points: [cursor] };
    strokes.push(stroke);
    request();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (pointer !== null && pointer !== e.pointerId) return;
    cursor = point(e);
    if (stroke) {
      for (const sample of e.getCoalescedEvents?.().length
        ? e.getCoalescedEvents()
        : [e]) {
        if (stroke.points.length < 12000) stroke.points.push(point(sample));
      }
    }
    request();
  });
  canvas.addEventListener("pointerup", (e) => {
    if (e.pointerId !== pointer) return;
    finish();
    if (e.pointerType !== "mouse") cursor = null;
    request();
  });
  canvas.addEventListener("pointercancel", () => {
    finish();
    cursor = null;
    request();
  });
  canvas.addEventListener("lostpointercapture", () => {
    if (stroke) finish();
  });
  canvas.addEventListener("pointerleave", () => {
    if (!stroke) {
      cursor = null;
      request();
    }
  });
  controls.addEventListener("click", (e) => {
    const action = e.target.closest("[data-laser]")?.dataset.laser;
    if (action === "colors") {
      palette.hidden = !palette.hidden;
      sync();
    }
    if (action === "clear") clear();
    if (action === "done") stop();
  });
  deck.on("slidechanged", () => {
    clear();
    if (active) layout();
  });
  deck.on("overviewshown", stop);
  deck.on("resize", () => {
    if (active) layout();
  });
  window.addEventListener("resize", () => {
    if (active) layout();
  });
  window.addEventListener("beforeprint", stop);
  return {
    controls,
    closePalette() {
      palette.hidden = true;
      sync();
    },
    paletteOpen: () => !palette.hidden,
    isActive: () => active,
    stop,
    start() {
      active = true;
      canvas.hidden = false;
      layout();
      sync();
    },
  };
};
