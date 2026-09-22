/* A short content fade leaves all geometry unchanged. Annotation plugins can
   measure their targets throughout the transition; frame and dock stay still. */
Presentation.factories.transitions = function (context) {
  const { deck } = context;
  let animations = [];
  const cancel = () => {
    animations.forEach((animation) => animation.cancel());
    animations = [];
  };
  deck.on("slidechanged", (event) => {
    cancel();
    if (
      deck.isOverview() ||
      !event.previousSlide ||
      !event.currentSlide ||
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      new URLSearchParams(location.search).has("print-pdf")
    )
      return;
    for (const element of event.currentSlide.children) {
      if (
        element.matches(
          ".presentation-header, .presentation-footer, .presentation-notes-preview, .rough-annotation, aside, template, script, style",
        )
      )
        continue;
      const computed = getComputedStyle(element);
      if (computed.display === "none" || computed.visibility === "hidden")
        continue;
      animations.push(
        element.animate([{ opacity: 0 }, { opacity: computed.opacity }], {
          duration: 160,
          easing: "ease-out",
        }),
      );
    }
  });
  [
    "overviewshown",
    "overviewhidden",
    "fragmentshown",
    "fragmenthidden",
  ].forEach((name) => deck.on(name, cancel));
  window.addEventListener("beforeprint", cancel);
};
