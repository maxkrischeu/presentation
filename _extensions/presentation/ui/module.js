Presentation.register({
  id: "frame",
  setup(context) {
    return Presentation.factories.frame(context);
  },
});
Presentation.register({
  id: "shell",
  requires: ["frame"],
  interactiveOnly: true,
  setup(context) {
    const { deck, changed } = context;
    Presentation.factories.viewport(context);
    Presentation.factories.transitions(context);
    const menu = deck.getPlugin("menu");
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
          label: "Keyboard Help",
          key: "?",
          kind: "panel",
          menu: "modes",
          run: () => deck.toggleHelp(),
        },
        {
          id: "search",
          label: "Search",
          kind: "panel",
          run: () => {
            const input = document.querySelector(".searchbox");
            if (input?.style.display === "inline") {
              input.style.display = "none";
              input.querySelector("input")?.blur();
            } else deck.getPlugin("search")?.open();
          },
        },
        {
          id: "fullscreen",
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
          label: "Speaker View",
          key: "S",
          menu: "modes",
          run: () => deck.getPlugin("notes")?.open(),
        },
        {
          id: "resetSession",
          label: "Reset Session",
          menu: "utilities",
          run: () => {
            if (
              confirm(
                context.t(
                  "Reset this session? Quiz answers and scores, slide drawings and chalkboards will be cleared. Images will return to the prepared layout. This cannot be undone.",
                ),
              )
            )
              return Presentation.session.reset();
          },
        },
      ],
      modes: [
        {
          id: "blackout",
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
          isOpen: () => menu?.isOpen(),
          close: () => menu?.closeMenu(),
        },
        {
          id: "help",
          priority: 30,
          isOpen: () => !!document.querySelector(".overlay-help"),
          close: () => deck.toggleHelp(false),
        },
        {
          id: "search",
          priority: 30,
          isOpen: () =>
            document.querySelector(".searchbox")?.style.display === "inline",
          close: () => {
            const box = document.querySelector(".searchbox");
            if (box) {
              box.style.display = "none";
              box.querySelector("input")?.blur();
            }
          },
        },
      ],
    };
  },
});
