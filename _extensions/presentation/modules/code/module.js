/* Code viewports belong to the session, just like other visible slide state. */
Presentation.register({
  id: "code",
  requires: ["frame"],
  setup(context) {
    const { deck } = context;
    const printing = window.matchMedia("print");
    const entries = [];
    const positive = (value) => Number.isFinite(value) && value > 0 && value < 100000;
    const length = (value) => Number.isFinite(value) && value >= 0 && value < 100000;
    const metrics = { width: "width", height: "height", fontSize: "font-size",
      lineHeight: "line-height", maxHeight: "max-height", paddingTop: "padding-top",
      paddingRight: "padding-right", paddingBottom: "padding-bottom", paddingLeft: "padding-left" };
    const position = (value) => Number.isFinite(value) && value > 0 ? value : 0;
    const saved = context.saved("code");
    const blocks = saved?.version === 1 && Array.isArray(saved.blocks) ? saved.blocks : [];
    for (const slide of deck.getSlides()) {
      let index = 0;
      for (const element of slide.querySelectorAll("pre > code")) {
        if (element.closest("section") !== slide) continue;
        const state = { slide: slide.id, index: index++, top: 0, left: 0 };
        const previous = blocks.find((block) => block.slide === state.slide && block.index === state.index);
        if (previous) {
          state.top = position(previous.top);
          state.left = position(previous.left);
          for (const key of Object.keys(metrics))
            if (length(previous[key])) state[key] = previous[key];
        }
        const style = getComputedStyle(element);
        for (const key of ["fontSize", "lineHeight", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"])
          if (!length(state[key])) state[key] = parseFloat(style[key]);
        entries.push({ element, state, restored: false,
          savedViewport: positive(previous?.width) && positive(previous?.height),
          limit: parseFloat(style.maxHeight) });
      }
    }
    const apply = ({ element, state }) => {
      element.classList.add("presentation-code-window");
      for (const [key, css] of Object.entries(metrics)) {
        if (length(state[key])) element.style.setProperty("--presentation-code-" + css, state[key] + "px");
      }
    };
    const fit = (entry) => {
      const { element, state, limit } = entry;
      const slide = element.closest("section");
      const rect = element.getBoundingClientRect(), bounds = slide.getBoundingClientRect();
      if (!rect.width || !bounds.height || !slide.offsetHeight) return;
      if (context.print && entry.savedViewport) return;
      const scale = bounds.height / slide.offsetHeight;
      // Follow normal document flow, including filename wrappers and content
      // after the block. Absolute decorations do not consume content space.
      let tail = 0;
      for (let node = element; node !== slide; node = node.parentElement) {
        const own = getComputedStyle(node);
        tail = Math.max(tail, (node.getBoundingClientRect().bottom - rect.bottom) / scale + (parseFloat(own.marginBottom) || 0));
        for (let next = node.nextElementSibling; next; next = next.nextElementSibling) {
          const style = getComputedStyle(next);
          if (style.display === "none" || ["absolute", "fixed"].includes(style.position)) continue;
          tail = Math.max(tail, (next.getBoundingClientRect().bottom - rect.bottom) / scale + (parseFloat(style.marginBottom) || 0));
        }
      }
      const style = getComputedStyle(element);
      const inset = style.boxSizing === "border-box" ? 0 :
        ["paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth"]
          .reduce((sum, key) => sum + (parseFloat(style[key]) || 0), 0);
      const available = Math.max(0, (bounds.bottom - rect.top) / scale -
        (parseFloat(getComputedStyle(slide).paddingBottom) || 0) - tail - inset);
      element.style.setProperty("--presentation-code-available", Math.min(positive(limit) ? limit : Infinity, available) + "px");
    };
    const measure = (entry) => {
      const { element, state } = entry;
      // Reveal finishes arranging print pages after module initialization.
      // Unvisited/prepared blocks must be measured again in that final layout.
      if (context.print && !entry.savedViewport) {
        delete state.width;
        delete state.height;
        element.style.removeProperty("--presentation-code-width");
        element.style.removeProperty("--presentation-code-height");
      }
      apply(entry);
      fit(entry);
      const style = getComputedStyle(element);
      // Hidden slides still expose font and maximum-height styles, but their
      // zero-sized geometry must not erase a previously visible viewport.
      for (const key of ["fontSize", "lineHeight", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"])
        if (!context.print || !length(state[key])) state[key] = parseFloat(style[key]);
      const max = parseFloat(style.maxHeight);
      if (positive(max) && (!context.print || !positive(state.maxHeight))) {
        state.maxHeight = max + (style.boxSizing === "border-box" ? 0 :
          ["paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth"]
            .reduce((sum, key) => sum + (parseFloat(style[key]) || 0), 0));
      }
      if (element.offsetHeight && element.offsetWidth && (!context.print || !entry.savedViewport)) {
        if (!entry.restored) {
          element.scrollTop = state.top;
          element.scrollLeft = state.left;
          entry.restored = true;
        }
        state.width = element.offsetWidth;
        state.height = element.offsetHeight;
        state.top = element.scrollTop;
        state.left = element.scrollLeft;
      }
      apply(entry);
    };
    const preparePrint = () => {
      for (const entry of entries) {
        if (context.print && !entry.savedViewport) measure(entry);
        apply(entry);
        entry.element.scrollTop = entry.state.top;
        entry.element.scrollLeft = entry.state.left;
      }
    };
    const refresh = () => {
      if (printing.matches) return;
      for (const entry of entries) measure(entry);
      if (context.print) preparePrint();
    };
    for (const entry of entries) {
      measure(entry);
      if (!context.print) entry.element.addEventListener("scroll", () => {
        if (!printing.matches && entry.element.offsetHeight) {
          entry.state.top = entry.element.scrollTop;
          entry.state.left = entry.element.scrollLeft;
        }
      }, { passive: true });
    }
    if (context.print) preparePrint();
    else {
      let pending = false;
      const schedule = () => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => { pending = false; refresh(); });
      };
      const observer = new ResizeObserver(schedule);
      for (const { element } of entries) observer.observe(element);
      for (const slide of deck.getSlides()) observer.observe(slide);
      deck.on("slidechanged", schedule);
      deck.on("resize", schedule);
    }
    document.fonts.ready.then(refresh);
    window.addEventListener("beforeprint", preparePrint);
    window.addEventListener("afterprint", refresh);
    printing.addEventListener("change", (event) => event.matches ? preparePrint() : refresh());
    return {
      preparePrint,
      snapshot() {
        refresh();
        return { version: 1, blocks: entries.map(({ state }) => ({ ...state })) };
      },
      reset() {
        for (const entry of entries) {
          entry.state.top = entry.state.left = 0;
          entry.element.scrollTo(0, 0);
        }
      },
    };
  },
});
