document.addEventListener("DOMContentLoaded", function () {
  // Default values
  const DEFAULT_PADDING = 5;
  const DEFAULT_ANIMATION_DURATION = 800;
  const DEFAULT_STROKE_WIDTH = 1;
  const DEFAULT_ITERATIONS = 2;

  /**
   * Parse a boolean attribute from a data attribute string.
   * Returns true unless the value is exactly "false".
   */
  function parseBooleanAttr(value) {
    return value !== "false";
  }

  /**
   * Parse padding value (can be single number or comma-separated array).
   */
  function parsePadding(value) {
    if (!value) return DEFAULT_PADDING;
    if (value.includes(",")) {
      return value.split(",").map((v) => parseInt(v.trim(), 10));
    }
    return parseInt(value, 10);
  }

  /**
   * Parse brackets value (can be single string or comma-separated array).
   */
  function parseBrackets(value) {
    if (!value) return "right";
    if (value.includes(",")) {
      return value.split(",").map((v) => v.trim());
    }
    return value;
  }

  /**
   * Create RoughNotation options object from an element's data attributes.
   * @param {HTMLElement} el - The element to annotate
   * @param {boolean} [animateOverride] - Optional override for animate option
   */
  function getAnnotationOptions(el, animateOverride) {
    const options = {
      type: el.dataset.rnType || "highlight",
      animate:
        animateOverride !== undefined
          ? animateOverride
          : parseBooleanAttr(el.dataset.rnAnimate),
      animateOnHide: true,
      animationDuration:
        parseInt(el.dataset.rnAnimationduration, 10) ||
        DEFAULT_ANIMATION_DURATION,
      color: el.dataset.rnColor || "#fff17680",
      strokeWidth:
        parseInt(el.dataset.rnStrokewidth, 10) || DEFAULT_STROKE_WIDTH,
      multiline: parseBooleanAttr(el.dataset.rnMultiline),
      iterations: parseInt(el.dataset.rnIterations, 10) || DEFAULT_ITERATIONS,
      rtl: el.dataset.rnRtl === "true",
      padding: parsePadding(el.dataset.rnPadding),
    };

    if (options.type === "bracket") {
      options.brackets = parseBrackets(el.dataset.rnBrackets);
    }

    return options;
  }

  // Presentation uses Reveal fragments exclusively; no additional global shortcut.
  const annotations = new Map();
  const printing = new URLSearchParams(location.search).has("print-pdf");
  function removeAll() {
    annotations.forEach((annotation) => annotation.remove());
    annotations.clear();
  }
  function show(element, animate = true) {
    if (annotations.has(element)) return;
    const annotation = RoughNotation.annotate(
      element,
      getAnnotationOptions(
        element,
        animate && !printing && parseBooleanAttr(element.dataset.rnAnimate),
      ),
    );
    annotations.set(element, annotation);
    annotation.show();
    // The library measures viewport pixels; undo the slide's scale on its SVG.
    const slide = element.closest("section");
    const scale = printing
      ? 1
      : slide.getBoundingClientRect().width / slide.offsetWidth;
    if (annotation._svg && scale > 0) {
      annotation._svg.style.transform = `scale(${1 / scale})`;
      annotation._svg.style.transformOrigin = "top left";
      annotation._svg.setAttribute("aria-hidden", "true");
    }
  }
  const animateNext = new Set();
  let frame = null;
  function refresh() {
    frame = null;
    if (printing) {
      document
        .querySelectorAll(".rn-fragment")
        .forEach((element) => show(element, false));
    } else {
      const scope = Reveal.isOverview()
        ? Reveal.getSlidesElement()
        : Reveal.getCurrentSlide();
      scope
        ?.querySelectorAll(".rn-fragment.visible")
        .forEach((element) => show(element, animateNext.has(element)));
    }
    animateNext.clear();
  }
  function schedule(invalidate = false) {
    if (invalidate) {
      removeAll();
      animateNext.clear();
    }
    // Measure after all Reveal/layout/transition event handlers have finished,
    // before the next paint. No stale 400 ms redraw or transition-time geometry.
    if (frame === null) frame = requestAnimationFrame(refresh);
  }
  Reveal.on("fragmentshown", (event) => {
    (event.fragments || [event.fragment])
      .filter((element) => element.classList.contains("rn-fragment"))
      .forEach((element) => animateNext.add(element));
    schedule();
  });
  Reveal.on("fragmenthidden", (event) => {
    (event.fragments || [event.fragment]).forEach((element) => {
      annotations.get(element)?.remove();
      annotations.delete(element);
      animateNext.delete(element);
    });
  });
  ["slidechanged", "resize", "overviewshown", "overviewhidden"].forEach(
    (name) => Reveal.on(name, () => schedule(true)),
  );
  Reveal.on("pdf-ready", () => document.fonts.ready.then(() => schedule(true)));
  const ready = () => {
    if (!printing) document.fonts.ready.then(() => schedule(true));
  };
  Reveal.on("ready", ready);
  if (Reveal.isReady()) ready();
});
