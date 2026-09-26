Presentation.register({
  id: "python",
  requires: ["frame"],
  interactiveOnly: true,
  setup(context) {
    const api = window.RevealDrop;
    return {
      modes: [
        {
          id: "python",
          icon: "<path d=\"m5 7 5 5-5 5m8 0h6\"/><rect x=\"2\" y=\"3\" width=\"20\" height=\"18\" rx=\"2\"/>",
          label: "Python Console",
          key: "T",
          enter: api.toggleDrop,
          exit: api.close,
          isActive: () => api.isActive(),
          dockClass: "presentation-python",
        },
      ],
      toolbar: { element: api.controls, modes: ["python"] },
    };
  },
});
