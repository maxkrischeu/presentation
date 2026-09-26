Presentation.register({
  id: "magnifier",
  requires: ["frame"],
  interactiveOnly: true,
  setup(context) {
    const api = Presentation.factories.magnifier(context);
    return {
      ...api,
      modes: [
        {
          id: "magnifier",
          icon: "<circle cx=\"10\" cy=\"10\" r=\"7\"/><path d=\"m15 15 6 6M7 10h6m-3-3v6\"/>",
          label: "Magnifier",
          key: "H",
          navigation: true,
          enter: api.start,
          exit: api.stop,
          isActive: api.isActive,
          dockClass: "presentation-magnifiering",
        },
      ],
      toolbar: { element: api.controls, modes: ["magnifier"] },
    };
  },
});
