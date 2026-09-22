Presentation.register({
  id: "exports",
  requires: ["images", "drawing", "quiz"],
  interactiveOnly: true,
  setup(context) {
    const api = Presentation.factories.exports(context);
    return {
      ...api,
      commands: [
        {
          id: "pdf",
          label: "Export Slides PDF",
          menu: "utilities",
          run: () => api.open("slides"),
        },
        {
          id: "chalkboardPdf",
          label: "Export Chalkboard PDF",
          menu: "utilities",
          allowIn: ["board"],
          run: () => api.open("chalkboard"),
        },
        {
          id: "exportPresentation",
          label: "Export Presentation",
          menu: "utilities",
          run: () => api.open("presentation"),
        },
      ],
    };
  },
});
