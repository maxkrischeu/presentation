/* Reuse Reveal's overview selection and indices; only its visual layout changes.
   CSS flattens stacks visually, while the slide DOM and navigation stay intact. */
Presentation.factories.overview = function (context) {
  const { deck } = context;
  const viewport = deck.getRevealElement();
  const slides = deck.getSlidesElement();
  const layout = () => {
    const ratio = deck.getConfig().width / deck.getConfig().height;
    const width = Math.min(viewport.clientWidth, viewport.clientHeight * ratio);
    const height = width / ratio;
    slides.style.setProperty("--presentation-overview-width", `${width}px`);
    slides.style.setProperty("--presentation-overview-height", `${height}px`);
    slides.style.setProperty(
      "--presentation-overview-left",
      `${(viewport.clientWidth - width) / 2}px`,
    );
    slides.style.setProperty(
      "--presentation-overview-top",
      `${(viewport.clientHeight - height) / 2}px`,
    );
    const columns = width >= 1000 ? 3 : width >= 620 ? 2 : 1;
    const scale =
      (width - 64 - (columns - 1) * 20) / (columns * deck.getConfig().width);
    slides.style.setProperty("--presentation-overview-columns", columns);
    slides.style.setProperty("--presentation-thumbnail-scale", scale);
    slides.style.setProperty(
      "--presentation-slide-width",
      `${deck.getConfig().width}px`,
    );
    slides.style.setProperty(
      "--presentation-slide-height",
      `${deck.getConfig().height}px`,
    );
  };
  const showCurrent = () => {
    if (deck.isOverview())
      requestAnimationFrame(() =>
        deck
          .getCurrentSlide()
          ?.scrollIntoView({ block: "nearest", inline: "nearest" }),
      );
  };
  deck.on("overviewshown", () => {
    context.get("drawing").captureNotes?.();
    layout();
    showCurrent();
  });
  deck.on("slidechanged", showCurrent);
  // Native scrolling handles thumbnails, gaps and padding. Forward wheel input
  // from outside the 16:9 stage too, without stealing it from menus or editors.
  document.addEventListener(
    "wheel",
    (event) => {
      if (
        !deck.isOverview() ||
        event.ctrlKey ||
        slides.contains(event.target) ||
        event.target.closest?.(
          ".slide-menu-wrapper, .overlay, input, textarea, select",
        )
      )
        return;
      const unit =
        event.deltaMode === 1
          ? 20
          : event.deltaMode === 2
            ? slides.clientHeight
            : 1;
      slides.scrollTop += event.deltaY * unit;
      event.preventDefault();
      event.stopPropagation();
    },
    { capture: true, passive: false },
  );
  window.addEventListener("resize", layout);
  layout();
};
