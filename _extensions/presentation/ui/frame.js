Presentation.factories.frame = function (context) {
  const { deck } = context;
  const template = document.getElementById("presentation-frame-template");
  if (!template) throw new Error("Presentation: Rahmeneinstellungen fehlen.");
  if (template.dataset.dateInHeader === "true")
    deck.getSlidesElement().querySelector("#title-slide > .date")?.remove();
  const slides = Array.from(
    deck.getSlidesElement().querySelectorAll("section"),
  ).filter(
    (slide) =>
      !slide.querySelector(":scope > section") &&
      slide.dataset.visibility !== "hidden",
  );
  slides.forEach((slide, index) => {
    slide.classList.add("presentation-slide");
    const frame = template.content.cloneNode(true);
    frame
      .querySelector("header")
      .setAttribute("aria-label", Presentation.t("Header"));
    frame
      .querySelector("footer")
      .setAttribute("aria-label", Presentation.t("Footer"));
    slide.append(frame);
    const center = slide.querySelector(".presentation-header-center");
    if (template.dataset.slideNumber === "true") {
      const text = center.textContent.trim();
      const number = document.createElement("span");
      number.className = "presentation-header-number";
      number.textContent = (text ? " · " : "") + `${index + 1} / ${slides.length}`;
      center.append(number);
    }
    center.title = center.textContent;
    const logo = slide.querySelector(".presentation-logo");
    if (
      logo &&
      slide.matches("#title-slide, .title-slide.level1, .quiz-intro")
    ) {
      const watermark = logo.cloneNode(true);
      watermark.className = "presentation-chapter-logo";
      watermark.alt = "";
      watermark.setAttribute("aria-hidden", "true");
      slide.prepend(watermark);
    }
    slide.style.setProperty(
      "--presentation-progress",
      slides.length <= 1 ? 1 : index / (slides.length - 1),
    );
    slide.querySelectorAll(".presentation-label").forEach((el) => {
      el.title = el.textContent;
    });
  });

  // Keep the centre geometrically centred, but reclaim unused space from both
  // side tracks. Long side labels retain the former one-third fallback.
  const headers = slides.map(slide => slide.querySelector(".presentation-header"));
  const layoutHeaders = () => {
    for (const header of headers) {
      const width = header.clientWidth, rect = header.getBoundingClientRect();
      if (!width || !rect.width) continue;
      const unscale = width / rect.width;
      const textWidth = element => {
        if (!element?.textContent) return 0;
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.getBoundingClientRect().width * unscale;
      };
      const left = header.querySelector(".presentation-header-left");
      const logo = left.querySelector(".presentation-logo");
      const leftWidth = textWidth(left.querySelector(".presentation-label")) +
        (logo ? logo.getBoundingClientRect().width * unscale + (parseFloat(getComputedStyle(left).gap) || 0) : 0);
      const rightWidth = textWidth(header.querySelector(".presentation-header-right"));
      const gap = parseFloat(getComputedStyle(header).columnGap) || 0;
      const side = Math.min(Math.max(leftWidth, rightWidth), Math.max(0, (width - 2 * gap) / 3));
      const value = `${side.toFixed(2)}px`;
      if (header.style.getPropertyValue("--presentation-header-side") !== value)
        header.style.setProperty("--presentation-header-side", value);
    }
  };
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; layoutHeaders(); });
  };
  const observer = new ResizeObserver(schedule);
  headers.forEach(header => observer.observe(header));
  for (const event of ["resize", "slidechanged", "overviewshown", "overviewhidden"])
    deck.on(event, schedule);
  document.fonts?.ready.then(schedule);
  document.fonts?.addEventListener("loadingdone", schedule);
  schedule();
  return { dock: template.dataset.dock === "true",
    dockItems: template.dataset.dockItems ? JSON.parse(template.dataset.dockItems) : null };
};
