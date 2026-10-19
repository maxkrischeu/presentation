Presentation.register({
  id: "python",
  requires: ["frame"],
  interactiveOnly: true,
  setup(context) {
    const api = window.RevealDrop;
    let slideOwned = false;
    const followSlide = () => {
      const automatic = !context.deck.isOverview() &&
        context.deck.getCurrentSlide()?.classList.contains("python");
      api.setSlideMode(!!automatic);
      if (automatic) {
        slideOwned = Presentation.modes.activate("python");
        if (slideOwned) api.focusEditor();
      } else if (slideOwned) {
        slideOwned = false;
        api.close();
      }
    };
    for (const event of ["slidechanged", "overviewshown", "overviewhidden"])
      context.deck.on(event, followSlide);
    // Also handle a direct URL to a Python slide, after commands and modes mount.
    Promise.resolve().then(() => Presentation.ready).then(followSlide, () => {});
    return {
      modes: [
        {
          id: "python",
          icon: "<path d=\"m5 7 5 5-5 5m8 0h6\"/><rect x=\"2\" y=\"3\" width=\"20\" height=\"18\" rx=\"2\"/>",
          label: "Python Console",
          menuOrder: 90,
          key: "T",
          enter: api.open,
          exit: api.close,
          isActive: () => api.isActive(),
          dockClass: "presentation-python",
        },
      ],
      toolbar: { element: api.controls, modes: ["python"] },
    };
  },
});
