Presentation.register({
  id: "laser",
  requires: ["frame"],
  interactiveOnly: true,
  setup(context) {
    const api = Presentation.factories.laser(context);
    return {
      ...api,
      modes: [
        {
          id: "laser",
          label: "Laser Pointer",
          key: "L",
          navigation: true,
          enter: api.start,
          exit: api.stop,
          isActive: api.isActive,
          dockClass: "presentation-lasering",
        },
      ],
      toolbar: { element: api.controls, modes: ["laser"] },
      panels: [
        {
          id: "laser-colors",
          priority: 50,
          isOpen: api.paletteOpen,
          close: api.closePalette,
        },
      ],
    };
  },
});
