/* A non-interactive styled mirror keeps text and SVG sharp inside a moving lens. */
Presentation.factories.magnifier = function (context) {
  const { deck } = context;
  const container = document.createElement("div");
  container.className = "presentation-magnifier";
  container.hidden = true;
  container.setAttribute("aria-hidden", "true");
  container.dataset.preventSwipe = "true";
  const lens = document.createElement("div");
  lens.className = "presentation-magnifier-lens";
  const mirror = document.createElement("div");
  mirror.className = "presentation-magnifier-mirror";
  mirror.inert = true;
  lens.append(mirror);
  container.append(lens);
  document.body.append(container);
  let active = false,
    radius = 100,
    zoom = 2,
    position = { x: 0.5, y: 0.5 },
    rect,
    pointer = null,
    refreshFrame = 0,
    settleTimer = 0,
    serial = 0,
    lastPointer = null;
  const controls = document.createElement("div");
  controls.className = "presentation-magnifier-controls";
  controls.hidden = true;
  const icons = {
    out: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6 M7 10h6"/>',
    in: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6 M7 10h6 M10 7v6"/>',
    smaller: '<circle cx="12" cy="12" r="6"/>',
    larger: '<circle cx="12" cy="12" r="9"/>',
    done: '<path d="m4 12 5 5L20 6"/>',
  };
  for (const [action, label] of [
    ["out", Presentation.t("Zoom Out")],
    ["in", Presentation.t("Zoom In")],
    ["smaller", Presentation.t("Smaller Lens")],
    ["larger", Presentation.t("Larger Lens")],
    ["done", Presentation.t("Done Magnifier")],
  ]) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.magnifier = action;
    b.title = label;
    b.setAttribute("aria-label", label);
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[action]}</svg>`;
    controls.append(b);
  }
  const value = document.createElement("output");
  controls.children[1].after(value);
  function sync() {
    controls.hidden = !active;
    value.textContent = `${zoom}×`;
    value.setAttribute(
      "aria-label",
      Presentation.t("Magnification {zoom} times", { zoom }),
    );
    for (const [action, disabled] of [
      ["out", zoom <= 1.5],
      ["in", zoom >= 4],
      ["smaller", radius <= 60],
      ["larger", radius >= 180],
    ])
      controls.querySelector(`[data-magnifier=${action}]`).disabled = disabled;
    context.changed();
  }
  function paint() {
    if (!active || !rect) return;
    const r = Math.min(radius * rect.scale, rect.width / 2, rect.height / 2);
    const x = position.x * rect.width,
      y = position.y * rect.height;
    const cx = Math.max(r, Math.min(rect.width - r, x)),
      cy = Math.max(r, Math.min(rect.height - r, y));
    Object.assign(lens.style, {
      left: cx - r + "px",
      top: cy - r + "px",
      width: 2 * r + "px",
      height: 2 * r + "px",
    });
    mirror.style.transform = `translate(${r - 2 - (x + rect.side * rect.scale) * zoom}px,${r - 2 - (y + rect.head * rect.scale) * zoom}px) scale(${rect.scale * zoom})`;
  }
  function snapshot() {
    if (!active) return;
    const source = deck.getCurrentSlide();
    if (!source) return;
    const clone = source.cloneNode(true),
      originals = [source, ...source.querySelectorAll("*")],
      copies = [clone, ...clone.querySelectorAll("*")];
    const ids = new Map();
    serial++;
    originals.forEach((el, i) => {
      if (el.id) {
        const id = `presentation-loupe-${serial}-${i}`;
        ids.set(el.id, id);
        copies[i].id = id;
      }
    });
    originals.forEach((el, i) => {
      const copy = copies[i];
      if (
        el.closest(
          ".presentation-header,.presentation-footer,script,style,iframe,object,embed",
        )
      )
        return;
      const style = getComputedStyle(el);
      // Values are already resolved: copying hundreds of inherited Quarto custom
      // properties and parsing the growing style attribute per property is wasteful.
      copy.style.cssText = Array.from(style)
        .filter((prop) => !prop.startsWith("--"))
        .map((prop) => `${prop}:${style.getPropertyValue(prop)};`)
        .join("");
      copy.style.animation = "none";
      copy.style.transition = "none";
      copy.removeAttribute("autofocus");
      for (const attr of [...copy.attributes]) {
        if (attr.name.startsWith("on")) copy.removeAttribute(attr.name);
        else if (attr.name !== "style" && attr.value.includes("#")) {
          let v = attr.value;
          for (const [old, id] of ids) {
            v = v.replaceAll(`url(#${old})`, `url(#${id})`);
            if (v === `#${old}`) v = `#${id}`;
          }
          if (v !== attr.value) copy.setAttribute(attr.name, v);
        }
      }
      if (el instanceof HTMLCanvasElement) {
        copy.width = el.width;
        copy.height = el.height;
        try {
          copy.getContext("2d").drawImage(el, 0, 0);
        } catch {}
      }
      if (el instanceof HTMLInputElement) copy.value = el.value;
    });
    clone
      .querySelectorAll(
        ".presentation-header,.presentation-footer,script,style,iframe,object,embed",
      )
      .forEach((el) => el.remove());
    clone.querySelectorAll("video").forEach((el) => {
      const placeholder = document.createElement("div");
      placeholder.style.cssText = el.style.cssText;
      placeholder.textContent = "Video";
      el.replaceWith(placeholder);
    });
    Object.assign(clone.style, {
      position: "absolute",
      left: "0px",
      top: "0px",
      margin: "0px",
      width: deck.getConfig().width + "px",
      height: deck.getConfig().height + "px",
      transform: "none",
      opacity: "1",
      visibility: "visible",
    });
    mirror.replaceChildren(clone);
    originals.forEach((el, i) => {
      if (el.scrollTop) copies[i].scrollTop = el.scrollTop;
      if (el.scrollLeft) copies[i].scrollLeft = el.scrollLeft;
    });
    paint();
  }
  function schedule() {
    if (active && !refreshFrame)
      refreshFrame = requestAnimationFrame(() => {
        refreshFrame = 0;
        snapshot();
      });
  }
  function layout() {
    const stage = deck.getRevealElement().getBoundingClientRect(),
      cfg = deck.getConfig(),
      css = getComputedStyle(document.documentElement),
      scale = Math.min(stage.width / cfg.width, stage.height / cfg.height),
      left = stage.left + (stage.width - cfg.width * scale) / 2,
      top = stage.top + (stage.height - cfg.height * scale) / 2,
      side = parseFloat(css.getPropertyValue("--presentation-side")) || 36,
      head = parseFloat(css.getPropertyValue("--presentation-header")) || 58,
      foot = parseFloat(css.getPropertyValue("--presentation-footer")) || 50;
    rect = {
      left: left + side * scale,
      top: top + head * scale,
      width: (cfg.width - 2 * side) * scale,
      height:
        (deck
          .getCurrentSlide()
          ?.querySelector(":scope > .presentation-footer")
          ?.getBoundingClientRect().top ?? top + (cfg.height - foot) * scale) -
        (top + head * scale),
      side,
      head,
      scale,
    };
    Object.assign(container.style, {
      left: rect.left + "px",
      top: rect.top + "px",
      width: rect.width + "px",
      height: rect.height + "px",
    });
    schedule();
    paint();
  }
  // Remember the pointer before entering the mode, without capturing normal input.
  window.addEventListener(
    "pointermove",
    (e) => {
      lastPointer = { clientX: e.clientX, clientY: e.clientY };
    },
    { passive: true, capture: true },
  );
  window.addEventListener(
    "pointerdown",
    (e) => {
      lastPointer = { clientX: e.clientX, clientY: e.clientY };
    },
    { passive: true, capture: true },
  );
  function move(e) {
    if (!active || (pointer !== null && e.pointerId !== pointer)) return;
    position = {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
    paint();
  }
  container.addEventListener("pointermove", move);
  container.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || pointer !== null) return;
    e.preventDefault();
    pointer = e.pointerId;
    container.setPointerCapture(pointer);
    move(e);
  });
  function release() {
    if (pointer !== null && container.hasPointerCapture(pointer))
      container.releasePointerCapture(pointer);
    pointer = null;
  }
  container.addEventListener("pointerup", release);
  container.addEventListener("pointercancel", release);
  const observer = new MutationObserver(schedule);
  function stop() {
    active = false;
    release();
    observer.disconnect();
    clearTimeout(settleTimer);
    cancelAnimationFrame(refreshFrame);
    refreshFrame = 0;
    container.hidden = true;
    mirror.replaceChildren();
    sync();
  }
  controls.addEventListener("click", (e) => {
    const a = e.target.closest("[data-magnifier]")?.dataset.magnifier;
    if (a === "done") stop();
    else if (a) {
      if (a === "in" || a === "out")
        zoom = Math.max(1.5, Math.min(4, zoom + (a === "in" ? 0.5 : -0.5)));
      else
        radius = Math.max(
          60,
          Math.min(180, radius + (a === "larger" ? 20 : -20)),
        );
      paint();
      sync();
    }
  });
  function watch() {
    observer.disconnect();
    if (active) {
      observer.observe(deck.getCurrentSlide(), {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
      layout();
      clearTimeout(settleTimer);
      if (deck.getCurrentSlide().getAnimations({ subtree: true }).length)
        settleTimer = setTimeout(schedule, 420);
    }
  }
  deck.on("slidechanged", watch);
  ["fragmentshown", "fragmenthidden"].forEach((name) =>
    deck.on(name, schedule),
  );
  deck.on("resize", () => {
    if (active) layout();
  });
  window.addEventListener("resize", () => {
    if (active) layout();
  });
  deck.on("overviewshown", stop);
  window.addEventListener("beforeprint", stop);
  return {
    controls,
    isActive: () => active,
    stop,
    start() {
      active = true;
      container.hidden = false;
      position = { x: 0.5, y: 0.5 };
      watch();
      if (lastPointer) move(lastPointer);
      sync();
    },
  };
};
