Presentation.register({
  id: "images",
  requires: ["frame"],
  async setup(context) {
    const api = Presentation.factories.images(context);
    await api.ready;
    return {
      ...api,
      snapshot: api.snapshot,
      reset: api.resetSession,
      modes: [
        {
          id: "position",
          icon: "<path d=\"M12 3v18M3 12h18m-12-6 3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3\"/>",
          entryPanel: "images",
          label: "Position Images",
          menuOrder: 50,
          key: "V",
          enter: () =>
            api.libraryOpen() ? api.closeLibrary() : api.position(),
          exit: api.close,
          stepOut: api.done,
          isActive: api.isEditing,
          dockClass: "presentation-positioning",
          onKey(event) {
            const key = event.key.toLowerCase();
            if ((event.ctrlKey || event.metaKey) && key === "z") {
              if (!event.repeat) (event.shiftKey ? api.redo : api.undo)();
              return true;
            }
            if (
              !event.ctrlKey &&
              !event.metaKey &&
              ["delete", "backspace"].includes(key)
            ) {
              if (!event.repeat) api.remove();
              return true;
            }
            return false;
          },
        },
      ],
      commands: [
        {
          id: "assets",
          panel: "images",
          icon: "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><circle cx=\"8\" cy=\"9\" r=\"1.5\"/><path d=\"m4 18 6-6 4 4 3-3 4 4\"/>",
          label: "Media Library",
          menuOrder: 40,
          key: "I",
          kind: "panel",
          menu: "modes",
          allowIn: ["position"],
          run: () => (api.isEditing() ? api.toggleLibrary() : api.toggle()),
        },
        {
          id: "saveSource",
          label: "Save to Source",
          menuOrder: 10,
          menu: "utilities",
          run: api.saveToSource,
        },
      ],
      panels: [
        {
          id: "images",
          priority: 40,
          edge: {
            side: "right", command: "assets",
            element: api.libraryElement,
            viewport: api.libraryViewport,
            scrollBy: api.libraryScrollBy,
          },
          isOpen: api.libraryOpen,
          close: api.closeLibrary,
        },
      ],
      toolbar: { element: api.controls, modes: ["position"] },
      help: [
        ["Ctrl/Cmd + Z / Shift + Z", "Undo / redo (image editing)"],
        ["Delete / Backspace", "Delete selected image"],
        ["I (image editing)", "Open / close image library"],
      ],
    };
  },
});
