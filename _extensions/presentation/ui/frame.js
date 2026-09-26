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
      center.textContent =
        (text ? text + " · " : "") + `${index + 1} / ${slides.length}`;
    }
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
  return { dock: template.dataset.dock === "true",
    dockItems: template.dataset.dockItems ? JSON.parse(template.dataset.dockItems) : null };
};
