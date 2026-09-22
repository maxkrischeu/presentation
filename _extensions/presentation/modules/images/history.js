/* Object-scoped history uses stable placement IDs, not array positions or assets.
   A global transaction may contain several patches; scoped undo moves only the
   chosen object's patch so unrelated edits remain available globally. */
Presentation.createImageHistory = function (limit = 50) {
  const undo = [],
    redo = [],
    copy = (value) => JSON.parse(JSON.stringify(value));
  function find(stack, id) {
    for (let i = stack.length - 1; i >= 0; i--) {
      const patches = id
        ? stack[i].filter((p) => p.id === id && p.before && p.after)
        : stack[i];
      if (patches.length) return { i, patches };
    }
    return null;
  }
  function apply(from, to, state, id, reverse) {
    const entry = find(from, id);
    if (!entry) return;
    const chosen = new Set(entry.patches);
    from[entry.i] = from[entry.i].filter((p) => !chosen.has(p));
    if (!from[entry.i].length) from.splice(entry.i, 1);
    // Remove first, then restore by position to preserve ordering for bulk edits.
    for (const p of entry.patches) {
      const items = state[p.slide] || [],
        index = items.findIndex((item) => item._id === p.id);
      if (index >= 0) items.splice(index, 1);
    }
    const key = reverse ? "before" : "after";
    for (const p of [...entry.patches].sort(
      (a, b) => a[key + "Index"] - b[key + "Index"],
    )) {
      if (!p[key]) continue;
      const items = state[p.slide] || (state[p.slide] = []);
      items.splice(Math.min(p[key + "Index"], items.length), 0, copy(p[key]));
    }
    to.push(entry.patches);
  }
  return {
    clear() {
      undo.length = 0;
      redo.length = 0;
    },
    record(before, after) {
      const patches = [];
      for (const slide of new Set([
        ...Object.keys(before),
        ...Object.keys(after),
      ])) {
        const old = before[slide] || [],
          next = after[slide] || [];
        const ids = new Set([...old, ...next].map((item) => item._id));
        for (const id of ids) {
          const beforeIndex = old.findIndex((item) => item._id === id),
            afterIndex = next.findIndex((item) => item._id === id);
          const a = old[beforeIndex] || null,
            b = next[afterIndex] || null;
          if (JSON.stringify(a) !== JSON.stringify(b))
            patches.push({
              slide,
              id,
              before: copy(a),
              after: copy(b),
              beforeIndex,
              afterIndex,
            });
        }
      }
      if (!patches.length) return;
      undo.push(patches);
      if (undo.length > limit) undo.shift();
      redo.length = 0;
    },
    canUndo: (id) => !!find(undo, id),
    canRedo: (id) => !!find(redo, id),
    undo: (state, id) => apply(undo, redo, state, id, true),
    redo: (state, id) => apply(redo, undo, state, id, false),
  };
};
