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
