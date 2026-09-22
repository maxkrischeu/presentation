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
          entryPanel: "images",
          label: "Position Images",
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
          label: "Image Library",
          key: "I",
          kind: "panel",
          menu: "modes",
          allowIn: ["position"],
          run: () => (api.isEditing() ? api.toggleLibrary() : api.toggle()),
        },
        {
          id: "saveSource",
          label: "Save to Source",
          menu: "utilities",
          run: api.saveToSource,
        },
      ],
      panels: [
        {
          id: "images",
          priority: 40,
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
