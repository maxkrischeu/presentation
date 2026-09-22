/* Versioned module-owned state, shared by export and reset. No feature names here. */
Presentation.session = {
  version: 2,
  saved(id) {
    const snapshot = window.__presentationSession;
    if (!snapshot) return undefined;
    if (snapshot.version !== 2 || !snapshot.modules)
      throw new Error("Unsupported presentation session version.");
    return snapshot.modules[id];
  },
  async capture() {
    const modules = {};
    for (const [id, module] of Presentation.modules()) {
      if (module.snapshot) modules[id] = await module.snapshot();
    }
    return JSON.parse(
      JSON.stringify({ version: 2, id: crypto.randomUUID(), modules }),
    );
  },
  async reset() {
    for (const module of Presentation.modules().values())
      await module.reset?.();
    Presentation.changed();
  },
};
