Presentation.register({
  id: "drawing",
  requires: ["frame"],
  interactiveOnly: true,
  setup(context) {
    const api = Presentation.factories.drawing(context);
    const toolbar = Presentation.factories.drawingToolbar(context, api);
    const penIcon = '<path d="m4 16-1 5 5-1L20 8l-4-4Z M13 7l4 4"/>';
    function onKey(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        if (!event.repeat) api.undoMove(event.shiftKey);
        return true;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return false;
      const key = event.key.toLowerCase();
      if (["p", "e"].includes(key)) {
        if (!event.repeat) toolbar.choose(key === "p" ? "colors" : "eraser");
        return true;
      }
      if (api.boarding() && ["arrowleft", "arrowright"].includes(key)) {
        if (!event.repeat)
          (key === "arrowleft" ? api.previousBoard : api.nextBoard)();
        return true;
      }
      return false;
    }
    context.deck.on("slidechanged", api.stop);
    context.deck.on("overviewshown", api.stop);
    return {
      ...api,
      reset: api.resetSession,
      toolbar,
      modes: [
        {
          id: "draw",
          label: "Notes Canvas",
          menuOrder: 10,
          key: "C",
          enter: api.draw,
          exit: api.stop,
          isActive: api.drawing,
          onKey,
          dockClass: "presentation-drawing",
          dock: { order: 3, icon: penIcon },
        },
        {
          id: "board",
          icon: "<rect x=\"3\" y=\"3\" width=\"18\" height=\"13\" rx=\"1\"/><path d=\"M8 21l2-5m6 5-2-5M7 12l6-5\"/>",
          label: "Chalkboard",
          menuOrder: 20,
          key: "B",
          enter: api.board,
          exit: api.stop,
          isActive: api.boarding,
          onKey,
          dockClass: "presentation-drawing",
        },
      ],
      panels: [
        {
          id: "drawing-palette",
          priority: 50,
          isOpen: toolbar.paletteOpen,
          close: toolbar.closePalette,
        },
      ],
      help: [
        ["P / E", "Pen / Eraser (drawing mode)"],
        ["Ctrl/Cmd + Z / Shift + Z", "Undo / redo lasso move"],
        ["← / → (chalkboard)", "Previous / next board"],
      ],
    };
  },
});
