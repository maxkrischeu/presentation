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
