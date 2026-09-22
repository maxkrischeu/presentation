Presentation.register({
  id: "quiz",
  requires: ["frame"],
  setup(context) {
    const plugin = context.deck.getPlugin("RevealQuiz");
    return {
      imageInsertionArea(slide) {
        const area = slide.querySelector(".quiz-image-area");
        return area ? area.getBoundingClientRect() : null;
      },
      snapshot: () => plugin.snapshot?.() || [],
      reset: () => plugin.reset?.(),
    };
  },
});
