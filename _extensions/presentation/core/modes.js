/* One keyboard policy for modes, transient panels and independent fullscreen. */
Presentation.mountModes = function (context) {
  const { deck, changed } = context;
  const definitions = Presentation.modeDefinitions;
  const commands = Presentation.commands;
  const current = () =>
    [...definitions.values()].find((mode) => mode.isActive())?.id || "standard";
  const orderedPanels = () =>
    [...Presentation.panels.values()].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0),
    );
  const panelOpen = () => orderedPanels().some((panel) => panel.isOpen());
  function closePanel() {
    const panel = orderedPanels().find((panel) => panel.isOpen());
    if (!panel) return false;
    panel.close();
    changed();
    return true;
  }
  function closePanels() {
    for (const panel of orderedPanels()) if (panel.isOpen()) panel.close();
  }
  function exit() {
    if (closePanel()) return;
    const mode = definitions.get(current());
    if (mode) (mode.stepOut || mode.exit)();
    else commands.get("fullscreen")?.exit?.();
    changed();
  }
  function invoke(id) {
    const command = commands.get(id);
    if (!command) throw new Error(`Unknown presentation command: ${id}`);
    const active = current();
    if (
      command.entryPanel &&
      Presentation.panels.get(command.entryPanel)?.isOpen() &&
      active === "standard"
    ) {
      Presentation.panels.get(command.entryPanel).close();
      changed();
      return;
    }
    if (command.kind === "mode" && active === id) {
      closePanels();
      command.exit();
      changed();
      return;
    }
    if (active !== "standard" && !command.allowIn?.includes(active)) return;
    if (command.kind === "panel") {
      // Preserve the target panel so its command can still toggle it closed.
      for (const panel of orderedPanels())
        if (panel.id !== command.panel && panel.isOpen()) panel.close();
      command.run();
    }
    else {
      closePanels();
      (command.enter || command.run)?.();
    }
    changed();
  }
  Presentation.modes = {
    current,
    exit,
    invoke,
    closePanel,
    closePanels,
    panelOpen,
  };
  // Disable the native keyboard map; explicit navigation remains below.
  deck.configure({ keyboard: false });
  const keys = new Map();
  for (const command of commands.values())
    if (command.key) {
      const key = command.key.toLowerCase();
      if (keys.has(key))
        throw new Error(`Duplicate keyboard shortcut: ${command.key}`);
      keys.set(key, command.id);
    }
  window.addEventListener(
    "keydown",
    (event) => {
      if (event.isComposing || event.defaultPrevented) return;
      const editable =
        event.target.isContentEditable ||
        event.target.closest?.(
          'input, textarea, select, [role="textbox"], [data-presentation-keyboard="local"], dialog[open]',
        );
      if (editable) return;
      const key = event.key.toLowerCase();
      const consume = () => {
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      if (key === "escape") {
        event.stopImmediatePropagation();
        return;
      }
      if (
        key === "enter" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey
      ) {
        consume();
        if (!event.repeat) exit();
        return;
      }
      const mode = definitions.get(current());
      if (mode?.onKey?.(event)) {
        consume();
        changed();
        return;
      }
      if (
        key === "f" &&
        event.shiftKey &&
        (event.ctrlKey || event.metaKey) &&
        !event.altKey
      ) {
        consume();
        if (!event.repeat && (!mode || mode.id === "search")) invoke("search");
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (keys.has(key)) {
        consume();
        if (!event.repeat) invoke(keys.get(key));
        return;
      }
      if (["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)) {
        if ((!mode || mode.navigation) && !panelOpen() && !event.shiftKey) {
          consume();
          ({
            arrowleft: () =>
              mode?.navigation === "spatial" ? deck.left() : deck.prev(),
            arrowright: () =>
              mode?.navigation === "spatial" ? deck.right() : deck.next(),
            arrowup: () => deck.up(),
            arrowdown: () => deck.down(),
          })[key]();
        }
        return;
      }
      if (!["tab", " "].includes(key)) event.stopImmediatePropagation();
    },
    true,
  );
};
