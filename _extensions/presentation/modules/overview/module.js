Presentation.register({
  id: "overview",
  requires: ["drawing"],
  interactiveOnly: true,
  setup(context) {
    Presentation.factories.overview(context);
    return {
      modes: [
        {
          id: "overview",
          label: "Slide Overview",
          key: "O",
          navigation: "spatial",
          isActive: () => context.deck.isOverview(),
          enter: () => context.deck.toggleOverview(true),
          exit: () => context.deck.toggleOverview(false),
          dock: {
            order: 2,
            icon: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
          },
        },
      ],
    };
  },
});
