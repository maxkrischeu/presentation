/* The only runtime registry. Features register contracts, never edit this file. */
window.Presentation = window.Presentation || {};
(() => {
  const definitions = new Map();
  const instances = new Map();
  const subscribers = new Set();
  const commands = new Map();
  const modes = new Map();
  const panels = new Map();
  const toolbars = [];
  const factories = {};
  let context;
  let started = false;
  let pending = false;

  function unique(map, id, value) {
    if (!id || map.has(id))
      throw new Error(`Duplicate or missing registration: ${id}`);
    map.set(id, value);
  }
  function changed() {
    if (pending) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      for (const subscriber of subscribers) subscriber();
    });
  }
  function order() {
    const result = [],
      visiting = new Set(),
      visited = new Set();
    function visit(id) {
      if (visited.has(id)) return;
      if (visiting.has(id))
        throw new Error(`Circular module dependency: ${id}`);
      const definition = definitions.get(id);
      if (!definition) throw new Error(`Missing module dependency: ${id}`);
      visiting.add(id);
      for (const dependency of definition.requires || []) visit(dependency);
      visiting.delete(id);
      visited.add(id);
      result.push(definition);
    }
    for (const id of definitions.keys()) visit(id);
    return result;
  }
  Object.assign(Presentation, {
    factories,
    commands,
    modeDefinitions: modes,
    panels,
    toolbars,
    register(definition) {
      if (started)
        throw new Error("Register modules before presentation initialization.");
      unique(definitions, definition.id, definition);
    },
    get(id) {
      if (!instances.has(id)) throw new Error(`Module is not ready: ${id}`);
      return instances.get(id);
    },
    changed,
    subscribe(listener) {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    async start(deck) {
      if (started)
        throw new Error("This presentation runtime was already started.");
      started = true;
      context = Object.freeze({
        deck,
        t: Presentation.t,
        get: Presentation.get,
        changed,
        invoke: (id) => Presentation.modes.invoke(id),
        saved: (id) => Presentation.session.saved(id),
        print:
          new URLSearchParams(location.search).has("print-pdf") ||
          document.documentElement.classList.contains("print-pdf"),
      });
      for (const definition of order()) {
        if (context.print && definition.interactiveOnly) continue;
        const instance = await definition.setup(context);
        instances.set(definition.id, instance || {});
        for (const command of instance?.commands || [])
          unique(commands, command.id, command);
        for (const mode of instance?.modes || []) {
          unique(modes, mode.id, mode);
          unique(commands, mode.id, { menu: "modes", ...mode, kind: "mode" });
        }
        for (const panel of instance?.panels || [])
          unique(panels, panel.id, panel);
        if (instance?.toolbar) toolbars.push(instance.toolbar);
      }
      if (!context.print) {
        Presentation.mountModes(context);
        Presentation.mountMenu(context);
        Presentation.mountDock(context);
        Presentation.mountHelp(context);
      }
      changed();
      return context;
    },
    modules: () => new Map(instances),
  });
})();
