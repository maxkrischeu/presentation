Presentation.register({
  id: "frame",
  setup(context) {
    return Presentation.factories.frame(context);
  },
});
Presentation.register({
  id: "shell",
  requires: ["frame", "dialogs"],
  interactiveOnly: true,
  setup(context) {
    const { deck, changed } = context;
    Presentation.factories.viewport(context);
    Presentation.factories.transitions(context);
    const menu = deck.getPlugin("menu");
    let resetting = false;
    const isFullscreen = () =>
      !!(document.fullscreenElement || document.webkitFullscreenElement);
    const exitFullscreen = () => {
      if (!isFullscreen()) return;
      const fn = document.exitFullscreen || document.webkitExitFullscreen;
      Promise.resolve(fn?.call(document)).catch(console.warn);
    };
    for (const event of ["slidechanged", "overviewshown"])
      deck.on(event, () => {
        menu?.closeMenu();
        changed();
      });
    return {
      commands: [
        {
          id: "prev",
          label: "Previous Slide",
          run: () => deck.prev(),
          enabled: () => !deck.isFirstSlide() || deck.availableFragments().prev,
          dock: { order: 0, icon: '<path d="m14 5-7 7 7 7"/>' },
        },
        {
          id: "next",
          label: "Next Slide",
          run: () => deck.next(),
          enabled: () => !deck.isLastSlide() || deck.availableFragments().next,
          dock: { order: 1, icon: '<path d="m10 5 7 7-7 7"/>' },
        },
        {
          id: "more",
          panel: "menu",
          label: "Modes Menu",
          key: "M",
          kind: "panel",
          run: () => menu?.toggle(),
          dock: {
            order: 9,
            icon: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
          },
        },
        {
          id: "help",
          panel: "help",
          icon: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3v.1\"/>",
          label: "Keyboard Help",
          key: "?",
          kind: "panel",
          menu: "modes",
          run: () => deck.toggleHelp(),
        },
        {
          id: "fullscreen",
          icon: "<path d=\"M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6\"/>",
          label: "Fullscreen",
          key: "F",
          menu: "modes",
          exit: exitFullscreen,
          run: () => {
            if (isFullscreen()) exitFullscreen();
            else {
              const root = document.documentElement;
              Promise.resolve(
                (root.requestFullscreen || root.webkitRequestFullscreen)?.call(
                  root,
                ),
              ).catch(console.warn);
            }
          },
        },
        {
          id: "speaker",
          icon: "<rect x=\"2\" y=\"3\" width=\"20\" height=\"14\" rx=\"1\"/><path d=\"M8 21h8m-4-4v4M5 7h6m-6 3h4m5-3h5v6h-5Z\"/>",
          label: "Speaker View",
          key: "R",
          menu: "modes",
          run: () => deck.getPlugin("notes")?.open(),
        },
        {
          id: "resetSession",
          label: "Reset Session",
          menu: "utilities",
          run: async () => {
            if (resetting) return;
            resetting = true;
            try {
              const confirmed = await context.get("dialogs").confirm({
                title: context.t("Reset Session"),
                message: context.t("Reset this session? Quiz answers and scores, slide drawings and chalkboards will be cleared. Images will return to the prepared layout. This cannot be undone."),
                label: context.t("Reset"),
              });
              if (confirmed) await Presentation.session.reset();
            } finally {
              resetting = false;
            }
          },
        },
      ],
      modes: [
        {
          id: "blackout",
          icon: "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"m4 5 16 14\"/>",
          menu: false,
          label: "Black screen (standard mode)",
          key: ".",
          enter: () => deck.togglePause(true),
          exit: () => deck.togglePause(false),
          isActive: () => deck.isPaused(),
        },
      ],
      panels: [
        {
          id: "menu",
          priority: 30,
          edge: {
            side: "left", command: "more",
            scrollBy: delta => Presentation.scrollPanelBy(document.querySelector(".slide-menu .active-menu-panel"), delta),
            element: () => document.querySelector(".slide-menu"),
            viewport: () => document.querySelector(".slide-menu").parentElement.getBoundingClientRect(),
          },
          isOpen: () => menu?.isOpen(),
          close: () => menu?.closeMenu(),
        },
        {
          id: "help",
          priority: 30,
          isOpen: () => !!document.querySelector(".overlay-help"),
          close: () => deck.toggleHelp(false),
        },
      ],
    };
  },
});
