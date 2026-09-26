/* Displays module-owned controls. It does not know which features exist. */
Presentation.mountDock = function (context) {
  const { deck, t, invoke } = context;
  const root = document.createElement("nav");
  root.className = "presentation-dock";
  root.dataset.preventSwipe = "true";
  const standard = document.createElement("div");
  standard.className = "presentation-standard-controls";
  const buttons = [];
  const configured = context.get("frame").dockItems;
  const selected = configured === null
    ? [...Presentation.commands.values()].filter(c => c.dock)
        .sort((a, b) => a.dock.order - b.dock.order)
    : configured.map(id => {
        const command = Presentation.commands.get(id);
        if (!command || !(command.icon || command.dock?.icon))
          throw new Error(`presentation.dock.items: unknown command or missing icon: ${id}`);
        return command;
      });
  for (const command of selected) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = command.id;
    const label =
      t(command.label) + (command.key ? " (" + command.key + ")" : "");
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${command.icon || command.dock.icon}</svg>`;
    button.addEventListener("click", () => invoke(command.id));
    standard.append(button);
    buttons.push({ button, command });
  }
  standard.addEventListener("wheel", event => {
    if (event.ctrlKey || standard.scrollWidth <= standard.clientWidth) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? standard.clientWidth : 1;
    standard.scrollLeft += delta * unit;
    event.preventDefault();
    event.stopPropagation();
  }, { passive: false });
  root.append(standard);
  for (const toolbar of Presentation.toolbars) root.append(toolbar.element);
  const update = () => {
    const active = Presentation.modes.current();
    const mode = Presentation.modeDefinitions.get(active);
    const toolbar = Presentation.toolbars.find((bar) =>
      bar.modes.includes(active),
    );
    standard.hidden = !!toolbar;
    for (const bar of Presentation.toolbars) {
      const hidden = bar !== toolbar;
      const visibilityChanged = bar.element.hidden !== hidden;
      bar.element.hidden = hidden;
      if (!hidden || visibilityChanged) bar.update?.();
    }

    root.className =
      "presentation-dock" + (mode?.dockClass ? " " + mode.dockClass : "");
    root.hidden = !context.get("frame").dock && !toolbar;
    root.setAttribute("aria-label", t(mode?.label || "Presentation Tools"));
    for (const { button, command } of buttons) {
      button.disabled = command.enabled ? !command.enabled() : false;
      button.setAttribute(
        "aria-pressed",
        String(command.kind === "mode" && command.id === active),
      );
    }
  };
  const place = () => {
    const rect = deck.getSlidesElement().getBoundingClientRect();
    const footer = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--presentation-footer",
      ),
    );
    // The middle footer column remains available without covering its labels.
    standard.style.maxWidth = `${Math.max(48, rect.width / 3 - 24)}px`;
    root.style.left = `${rect.left + rect.width / 2}px`;
    root.style.top = `${rect.bottom - (deck.isOverview() ? 58 : footer * deck.getScale())}px`;
    root.style.height = `${footer * deck.getScale()}px`;
  };
  Presentation.subscribe(update);
  for (const name of [
    "slidechanged",
    "fragmentshown",
    "fragmenthidden",
    "overviewshown",
    "overviewhidden",
    "resize",
  ])
    deck.on(name, () => {
      update();
      place();
    });
  window.addEventListener("resize", place);
  document.body.append(root);
  update();
  place();
};
