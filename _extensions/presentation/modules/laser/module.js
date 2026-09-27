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
          icon: "<path d=\"m3 19 9-9 3 3-9 9Z M16 8l4-4m-5 1V2m4 7h3\"/>",
          label: "Laser Pointer",
          menuOrder: 30,
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
