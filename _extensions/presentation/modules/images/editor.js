Presentation.factories.images = function (context) {
  const { deck } = context;
  const slides = deck.getSlides();
  const catalog = new Map(),
    layers = new Map(),
    backgrounds = new Map();
  const geometry = Presentation.imageGeometry;
  const globals = [],
    lessonAssets = [],
    locals = new Map();
  const key =
    "presentation-assets-v1:" + location.pathname + ":" + document.title;
  const readTemplate = (id) => {
    const t = document.getElementById(id);
    return t ? JSON.parse(t.content.textContent) : {};
  };
  const source = readTemplate("presentation-source-layout"),
    prepared = readTemplate("presentation-prepared-layout");
  const renderedRevision = source.revision || window.__presentationSession?.id;
  const sourceIds = new Map();
  let sourceToken = null,
    sourceLiveReload = false,
    sourceConnection = Promise.resolve();
  const history = Presentation.createImageHistory();
  let state = {},
    selected = null,
    armed = null,
    editing = false,
    gesture = null;
  const copy = (value) => JSON.parse(JSON.stringify(value));
  const slideId = (slide) => slide.id || String(slides.indexOf(slide));
  const currentId = () => slideId(deck.getCurrentSlide());
  function collect(template, scope, list) {
    for (const img of template.content.querySelectorAll("img")) {
      const id = scope + ":" + img.dataset.assetId;
      if (catalog.has(id)) {
        console.warn("Duplicate image asset:", id);
        continue;
      }
      const preload = new Image();
      preload.src = img.src;
      catalog.set(id, { id, scope, src: img.src, label: img.alt, preload });
      list.push(id);
    }
  }
  document
    .querySelectorAll("template.presentation-assets-source[data-scope=global]")
    .forEach((t) => collect(t, "global", globals));
  document.querySelectorAll('template.presentation-assets-source[data-scope=lesson]')
    .forEach(t => collect(t, 'lesson', lessonAssets));
  slides.forEach((slide) => {
    const id = slideId(slide),
      items = [];
    slide
      .querySelectorAll("template.presentation-assets-source[data-scope=slide]")
      .forEach((t) => collect(t, id, items));
    locals.set(id, items);
    const layer = document.createElement("div");
    layer.className = "presentation-asset-layer";
    layer.dataset.preventSwipe = "true";
    const back = document.createElement("div");
    back.className = "presentation-asset-layer presentation-asset-background";
    slide.append(back, layer);
    backgrounds.set(id, back);
    layers.set(id, layer);
  });
  let libraryScope = "shared";
  const panel = document.createElement("aside");
  panel.className = "presentation-asset-library";
  panel.hidden = true;
  panel.setAttribute("aria-label", Presentation.t("Image Library"));
  panel.dataset.preventSwipe = "true";
  panel.innerHTML =
    '<ol class="slide-menu-toolbar"><li class="toolbar-panel-button active-toolbar-button"><i class="fas fa-images" aria-hidden="true"></i><br><span class="slide-menu-toolbar-label">Image Library</span></li><li class="toolbar-panel-button"><button data-library="close" aria-label="Close Image Library"><i class="fas fa-times" aria-hidden="true"></i><br><span class="slide-menu-toolbar-label">Close</span></button></li></ol><div class="presentation-asset-tabs" role="tablist" aria-label="Image source"><button type="button" role="tab" id="presentation-assets-shared" data-asset-scope="shared" aria-controls="presentation-asset-catalog">Shared</button><button type="button" role="tab" id="presentation-assets-lesson" data-asset-scope="lesson" aria-controls="presentation-asset-catalog">This Lesson</button><button type="button" role="tab" id="presentation-assets-slide" data-asset-scope="slide" aria-controls="presentation-asset-catalog">This Slide</button></div><div class="presentation-asset-catalog" id="presentation-asset-catalog" role="tabpanel"></div>';
  const shell = document.createElement("div");
  shell.className = "slide-menu-wrapper presentation-assets-shell";
  const backdrop = document.createElement("div");
  backdrop.className = "presentation-asset-backdrop";
  backdrop.setAttribute("aria-hidden", "true");
  shell.append(backdrop, panel);
  backdrop.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeLibrary();
  });
  const syncPanel = () => {
    const visible = !panel.hidden && !panel.classList.contains("dragging");
    backdrop.classList.toggle("active", visible);
    panel.inert = panel.hidden;
  };
  new MutationObserver(syncPanel).observe(panel, {
    attributes: true,
    attributeFilter: ["hidden", "class"],
  });
  syncPanel();
  Presentation.localize(panel);
  const bar = document.createElement("div");
  bar.className = "presentation-image-controls";
  bar.hidden = true;
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", Presentation.t("Image editing"));
  for (const [action, label] of [
    ["undo", Presentation.t("Undo")],
    ["redo", Presentation.t("Redo")],
    ["delete", Presentation.t("Delete Image")],
    ["source", Presentation.t("Save to Source")],
    ["restore", Presentation.t("Restore Prepared Layout")],
    ["done", Presentation.t("Done")],
  ]) {
    const button = document.createElement("button");
    button.dataset.library = action;
    button.title = label;
    button.setAttribute("aria-label", label);
    const paths = {
      source: "M5 3h12l4 4v14H3V3Z M7 3v6h10V3 M7 21v-8h10v8",
      restore: "M3 5v6h6 M3 11a9 9 0 1 1 2 7",
      undo: "M9 5 3 11l6 6 M3 11h10a7 7 0 0 1 7 7",
      redo: "m15 5 6 6-6 6 M21 11H11a7 7 0 0 0-7 7",
      delete: "M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7",
      save: "M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5",
      load: "M12 16V4 m-5 5 5-5 5 5 M4 16v5h16v-5",
      done: "m4 12 5 5L20 6",
    };
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[action]}"/></svg>`;
    bar.append(button);
  }
  const properties = document.createElement("div");
  properties.className = "presentation-image-properties";
  properties.hidden = true;
  const fields = {};
  for (const [property, label] of [
    ["layer", Presentation.t("Layer")],
    ["rotation", Presentation.t("Rotation")],
    ["transparency", Presentation.t("Transparency")],
  ]) {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const field = document.createElement("input");
    field.type = "number";
    field.step = "1";
    field.className =
      property === "layer"
        ? "presentation-asset-level"
        : property === "rotation"
          ? "presentation-asset-angle"
          : "presentation-asset-transparency";
    field.setAttribute("aria-label", Presentation.t("Image " + property));
    if (property === "layer") {
      field.min = "0";
      field.max = "1000000";
      field.title = Presentation.t("0: behind text");
    } else if (property === "transparency") {
      field.min = "0";
      field.max = "100";
      field.title = Presentation.t("0%: opaque · 100%: transparent");
    } else field.title = Presentation.t("Rotation in degrees");
    if (property === "rotation" || property === "transparency") {
      const value = document.createElement("span");
      value.className = "presentation-unit-value";
      const display = document.createElement("span");
      display.className = "presentation-unit-display";
      display.setAttribute("aria-hidden", "true");
      const number = document.createElement("span");
      number.className = "presentation-unit-number";
      const unit = document.createElement("span");
      unit.textContent = property === "rotation" ? "°" : "%";
      display.append(number, unit);
      value.append(field, display);
      wrapper.append(value);
      field.updateUnit = () => {
        number.textContent = field.value;
        value.style.setProperty(
          "--presentation-value-chars",
          Math.max(1, field.value.length),
        );
      };
      field.addEventListener("input", field.updateUnit);
      field.addEventListener("blur", field.updateUnit);
    } else wrapper.append(field);
    fields[property] = field;
    properties.append(wrapper);
    field.addEventListener("change", () => {
      const item = state[currentId()]?.[selected],
        value = Number(field.value);
      if (!item) return;
      if (
        field.value === "" ||
        !Number.isFinite(value) ||
        (property === "transparency" && (value < 0 || value > 100)) ||
        (property === "layer" &&
          (!Number.isSafeInteger(value) || value < 0 || value > 1000000))
      ) {
        field.value = item[property];
        field.updateUnit?.();
        return;
      }
      const next = property === "rotation" ? geometry.angle(value) : value;
      if (next === item[property]) return;
      const before = copy(state);
      item[property] = next;
      if (property === "rotation")
        Object.assign(
          item,
          geometry.rotate(item, next, contentRatio(currentId())),
        );
      history.record(before, state);
      refresh();
      persist();
    });
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        field.blur();
      }
    });
  }
  bar.insertBefore(properties, bar.querySelector("[data-library=done]"));
  const status = document.createElement("div");
  status.className = "presentation-asset-status";
  status.setAttribute("role", "status");
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.hidden = true;
  document.body.append(shell, status, input);
  let statusTimer;
  const announce = (text) => {
    clearTimeout(statusTimer);
    status.textContent = Presentation.t(text);
    statusTimer = setTimeout(() => (status.textContent = ""), 6000);
  };
  const allowed = (id, asset) =>
    catalog.has(asset) &&
    (["global", "lesson", id].includes(catalog.get(asset).scope));
  function validate(data) {
    if (
      data.version !== 1 ||
      !data.slides ||
      typeof data.slides !== "object" ||
      Array.isArray(data.slides)
    )
      throw Error(Presentation.t("Invalid placement file."));
    const clean = {},
      ids = new Set();
    let skipped = 0,
      count = 0;
    for (const [id, items] of Object.entries(data.slides)) {
      if (!layers.has(id)) {
        skipped++;
        continue;
      }
      if (!Array.isArray(items)) throw Error("Invalid image list.");
      clean[id] = [];
      for (const item of items) {
        if (++count > 2000) throw Error("Too many images.");
        if (!allowed(id, item.asset)) {
          skipped++;
          continue;
        }
        if (
          !["x", "y", "w", "h"].every((k) => Number.isFinite(item[k])) ||
          item.w <= 0 ||
          item.h <= 0
        )
          throw Error("Invalid image position.");
        const w = Math.min(1, item.w),
          h = Math.min(1, item.h);
        const layer = item.layer ?? 1,
          rotation = item.rotation ?? 0,
          transparency = item.transparency ?? 0;
        if (
          !Number.isFinite(transparency) ||
          transparency < 0 ||
          transparency > 100
        )
          throw Error("Invalid image transparency.");
        if (
          !Number.isSafeInteger(layer) ||
          layer < 0 ||
          layer > 1000000 ||
          !Number.isFinite(rotation)
        )
          throw Error("Invalid image layer or rotation.");
        let identity =
          typeof item._id === "string" && item._id.length <= 100
            ? item._id
            : crypto.randomUUID();
        if (ids.has(identity)) identity = crypto.randomUUID();
        ids.add(identity);
        clean[id].push(
          geometry.fit(
            {
              _id: identity,
              asset: item.asset,
              x: item.x,
              y: item.y,
              w,
              h,
              layer,
              transparency,
              rotation: geometry.angle(rotation),
            },
            contentRatio(id),
          ),
        );
      }
    }
    return { clean, skipped };
  }
  function persist() {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          revision: renderedRevision,
          slides: state,
        }),
      );
    } catch {
      announce(
        Presentation.t(
          "Browser storage unavailable. Use Save to keep your work.",
        ),
      );
    }
  }
  const selectedIdentity = () => state[currentId()]?.[selected]?._id || null;
  function travel(direction) {
    const identity = selectedIdentity();
    history[direction](state, identity);
    selected = identity
      ? (state[currentId()] || []).findIndex((item) => item._id === identity)
      : null;
    if (selected === -1) selected = null;
    refresh();
    persist();
  }
  const hasImages = () => (state[currentId()] || []).length > 0;
  function contentRatio(id) {
    const layer = layers.get(id),
      style = getComputedStyle(layer);
    const slide = layer.parentElement,
      config = deck.getConfig();
    const width =
      Number(config.width) - parseFloat(style.left) - parseFloat(style.right);
    const height =
      Number(config.height) - parseFloat(style.top) - parseFloat(style.bottom);
    return width / height;
  }
  function refresh() {
    if (!hasImages()) {
      editing = false;
      selected = null;
    }
    for (const [id, layer] of layers) {
      const active = (editing || !!armed) && id === currentId(),
        back = backgrounds.get(id);
      layer.classList.toggle("editing", active);
      layer.replaceChildren();
      back.replaceChildren();
      (state[id] || []).forEach((item, index) => {
        const node = document.createElement("div");
        node.className = "presentation-placed-image";
        node.dataset.index = index;
        const chosen = active && selected === index;
        node.classList.toggle("selected", chosen);
        Object.assign(node.style, {
          left: item.x * 100 + "%",
          top: item.y * 100 + "%",
          width: item.w * 100 + "%",
          height: item.h * 100 + "%",
          transform: `rotate(${item.rotation}deg)`,
          zIndex: item.layer,
        });
        const img = document.createElement("img");
        img.src = catalog.get(item.asset).src;
        img.alt = catalog.get(item.asset).label;
        img.draggable = false;
        img.style.opacity = 1 - (item.transparency ?? 0) / 100;
        node.append(img);
        (item.layer === 0 ? back : layer).append(node);
        // Transparent editing proxy keeps a background image selectable without
        // moving its pixels in front of the text.
        let target = node;
        if (item.layer === 0 && active) {
          target = node.cloneNode(false);
          target.className = "presentation-image-proxy";
          target.classList.toggle("selected", chosen);
          layer.append(target);
        }
        if (chosen) {
          const grip = document.createElement("button");
          grip.className = "presentation-asset-resize";
          grip.setAttribute("aria-label", Presentation.t("Resize image"));
          target.append(grip);
          const handle = document.createElement("button");
          handle.className = "presentation-asset-rotate";
          handle.setAttribute("aria-label", Presentation.t("Rotate image"));
          handle.title = Presentation.t(
            "Rotate image · Snap: 45° · Shift: 15°",
          );
          // Anchored to the local image frame: the offset rotates with the image.
          target.append(handle);
        }
      });
    }
    const selectedItem = editing ? state[currentId()]?.[selected] : null;
    properties.hidden = !selectedItem;
    for (const [property, field] of Object.entries(fields)) {
      field.disabled = !selectedItem;
      if (document.activeElement !== field)
        field.value = selectedItem
          ? Math.round(selectedItem[property] * 100) / 100
          : "";
      field.updateUnit?.();
    }
    bar.hidden = !editing;
    for (const action of ["source", "restore"]) {
      bar.querySelector(`[data-library=${action}]`).hidden = !!selectedItem;
    }
    bar.querySelector("[data-library=delete]").hidden = !selectedItem;
    bar.querySelector("[data-library=undo]").disabled =
      !history.canUndo(selectedIdentity());
    bar.querySelector("[data-library=redo]").disabled =
      !history.canRedo(selectedIdentity());
    bar.querySelector("[data-library=delete]").disabled = selected === null;
    context.changed();
  }
  function library() {
    const container = panel.querySelector(".presentation-asset-catalog");
    container.replaceChildren();
    const localItems = locals.get(currentId()) || [];
    const groups = {shared: globals, lesson: lessonAssets, slide: localItems};
    const items = groups[libraryScope];
    panel.querySelectorAll("[data-asset-scope]").forEach((button) => {
      const shared = button.dataset.assetScope === "shared";
      const active = button.dataset.assetScope === libraryScope;
      button.textContent = `${Presentation.t(shared ? "Shared" : button.dataset.assetScope === "lesson" ? "This Lesson" : "This Slide")} (${groups[button.dataset.assetScope].length})`;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    container.setAttribute(
      "aria-labelledby",
      `presentation-assets-${libraryScope}`,
    );
    container.scrollTop = 0;
    if (items.length) {
      const grid = document.createElement("div");
      grid.className = "presentation-asset-grid";
      container.append(grid);
      for (const id of items) {
        const asset = catalog.get(id),
          button = document.createElement("button");
        button.dataset.asset = id;
        button.title = asset.label;
        const img = document.createElement("img");
        img.src = asset.src;
        img.alt = "";
        img.draggable = false;
        const label = document.createElement("span");
        label.textContent = asset.label;
        button.append(img, label);
        grid.append(button);
      }
    }
    if (!container.children.length) {
      const empty = document.createElement("p");
      empty.className = "presentation-asset-empty";
      empty.textContent =
        libraryScope === "shared"
          ? Presentation.t("No shared images prepared.")
          : Presentation.t("No images prepared for this slide.");
      container.append(empty);
    }
  }
  const selectScope = (scope) => {
    cancelGesture();
    armed = null;
    libraryScope = scope;
    library();
    refresh();
  };
  panel
    .querySelector(".presentation-asset-tabs")
    .addEventListener("click", (event) => {
      const button = event.target.closest("[data-asset-scope]");
      if (button) selectScope(button.dataset.assetScope);
    });
  panel
    .querySelector(".presentation-asset-tabs")
    .addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const scopes = ["shared", "lesson", "slide"];
      selectScope(scopes[(scopes.indexOf(libraryScope) + (event.key === "ArrowRight" ? 1 : 2)) % 3]);
      panel.querySelector(`[data-asset-scope="${libraryScope}"]`).focus();
    });
  function close() {
    cancelGesture();
    editing = false;
    panel.hidden = true;
    selected = null;
    armed = null;
    announce("");
    refresh();
  }
  function done() {
    if (selected !== null) {
      cancelGesture();
      selected = null;
      refresh();
    } else close();
  }
  function closeLibrary() {
    cancelGesture();
    panel.hidden = true;
    armed = null;
    announce("");
    refresh();
  }
  function open() {
    close();
    if (deck.isOverview()) deck.toggleOverview(false);
    context.changed();
    editing = false;
    libraryScope = (locals.get(currentId()) || []).length ? "slide" : lessonAssets.length ? "lesson" : "shared";
    panel.hidden = false;
    library();
    refresh();
    refreshAssets();
  }
  function position() {
    if (!hasImages()) return open();
    const wasEditing = editing;
    close();
    if (wasEditing) return;
    if (deck.isOverview()) deck.toggleOverview(false);
    context.changed();
    editing = true;
    refresh();
  }
  const api = {
    resetSession() {
      close();
      state = copy(prepared);
      history.clear();
      refresh();
      persist();
    },
    snapshot: () => ({
      version: 1,
      revision: renderedRevision,
      slides: copy(state),
    }),
    saveToSource: () => actions.source(),
    restore: () => actions.restore(),
    save: () => actions.save(),
    load: () => actions.load(),
    hasImages,
    closeLibrary,
    toggleLibrary() {
      if (!panel.hidden) closeLibrary();
      else {
        panel.hidden = false;
        libraryScope = (locals.get(currentId()) || []).length
          ? "slide"
          : "shared";
        library();
        refresh();
      }
    },
    toggle() {
      panel.hidden && !armed ? open() : closeLibrary();
    },
    close,
    position,
    controls: bar,
    isEditing: () => editing,
    isActive: () => editing || !panel.hidden || !!armed,
  };
  const point = (event) => {
    const rect = layers.get(currentId()).getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
      rect,
    };
  };
  async function insert(asset, event, imported = false) {
    const id = currentId(),
      p = point(event);
    if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return;
    const img = new Image();
    img.src = catalog.get(asset).src;
    try {
      await img.decode();
    } catch {
      announce(Presentation.t("This image could not be loaded."));
      return;
    }
    if (id !== currentId() || (panel.hidden && !armed && !imported)) return;
    let w = 0.25,
      h =
        (((w * p.rect.width) / p.rect.height) * img.naturalHeight) /
        img.naturalWidth;
    if (h > 0.6) {
      w *= 0.6 / h;
      h = 0.6;
    }
    // Optional public layout providers supply viewport rectangles; the image
    // editor does not need to know which feature owns the reserved region.
    for (const module of Presentation.modules().values()) {
      const area = module.imageInsertionArea?.(deck.getCurrentSlide());
      if (!area) continue;
      const left = Math.max(p.rect.left, area.left);
      const top = Math.max(p.rect.top, area.top);
      const width = Math.min(p.rect.right, area.right) - left;
      const height = Math.min(p.rect.bottom, area.bottom) - top;
      if (width <= 0 || height <= 0) continue;
      const scale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
      w = img.naturalWidth * scale / p.rect.width;
      h = img.naturalHeight * scale / p.rect.height;
      p.x = (left + width / 2 - p.rect.left) / p.rect.width;
      p.y = (top + height / 2 - p.rect.top) / p.rect.height;
      break;
    }
    const before = copy(state);
    const items = state[id] || (state[id] = []);
    items.push({
      _id: crypto.randomUUID(),
      asset,
      layer: 1,
      rotation: 0,
      transparency: 0,
      x: Math.max(0, Math.min(1 - w, p.x - w / 2)),
      y: Math.max(0, Math.min(1 - h, p.y - h / 2)),
      w,
      h,
    });
    history.record(before, state);
    editing = true;
    selected = items.length - 1;
    armed = null;
    panel.hidden = imported ? true : false;
    refresh();
    persist();
    announce(
      Presentation.t("Image selected. Close the library to move or resize it."),
    );
  }
  function insertCentered(asset) {
    const rect = layers.get(currentId()).getBoundingClientRect();
    return insert(asset, {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    });
  }
  panel.addEventListener("click", (event) => {
    const button = event.target.closest("[data-asset]");
    if (button && event.detail === 0 && !event.pointerType)
      insertCentered(button.dataset.asset);
  });
  function cancelGesture() {
    if (!gesture) return;
    if (gesture.before) {
      state = gesture.before;
      selected = null;
    }
    gesture.ghost?.remove();
    gesture = null;
    panel.classList.remove("dragging");
  }
  panel.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-asset]");
    if (!button || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    gesture = {
      type: "add",
      asset: button.dataset.asset,
      startX: event.clientX,
      startY: event.clientY,
      pointer: event.pointerId,
    };
    button.setPointerCapture(event.pointerId);
  });
  for (const layer of layers.values())
    layer.addEventListener("pointerdown", (event) => {
      if ((!editing && !armed) || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      if (armed) {
        insert(armed, event);
        return;
      }
      const node = event.target.closest("[data-index]");
      if (!node) {
        selected = null;
        refresh();
        return;
      }
      selected = Number(node.dataset.index);
      gesture = {
        type: event.target.closest(".presentation-asset-rotate")
          ? "rotate"
          : event.target.closest(".presentation-asset-resize")
            ? "resize"
            : "move",
        index: selected,
        start: point(event),
        item: copy(state[currentId()][selected]),
        before: copy(state),
        pointer: event.pointerId,
      };
      layer.setPointerCapture(event.pointerId);
      refresh();
    });
  document.addEventListener(
    "pointermove",
    (event) => {
      if (!gesture || gesture.pointer !== event.pointerId) return;
      event.preventDefault();
      if (gesture.type === "add") {
        if (
          Math.hypot(
            event.clientX - gesture.startX,
            event.clientY - gesture.startY,
          ) < 6 &&
          !gesture.ghost
        )
          return;
        if (!gesture.ghost) {
          const ghost = document.createElement("img");
          ghost.src = catalog.get(gesture.asset).src;
          ghost.className = "presentation-asset-ghost";
          document.body.append(ghost);
          gesture.ghost = ghost;
          panel.classList.add("dragging");
        }
        Object.assign(gesture.ghost.style, {
          left: event.clientX + "px",
          top: event.clientY + "px",
        });
        return;
      }
      const p = point(event),
        old = gesture.item,
        item = state[currentId()][gesture.index];
      const dx = p.x - gesture.start.x,
        dy = p.y - gesture.start.y;
      const ratio = contentRatio(currentId());
      if (gesture.type === "move") {
        Object.assign(
          item,
          geometry.fit({ ...old, x: old.x + dx, y: old.y + dy }, ratio),
        );
      } else if (gesture.type === "rotate") {
        const cx = old.x + old.w / 2,
          cy = old.y + old.h / 2;
        const start = Math.atan2(
          (gesture.start.y - cy) / ratio,
          gesture.start.x - cx,
        );
        const now = Math.atan2((p.y - cy) / ratio, p.x - cx);
        let rotation = old.rotation + ((now - start) * 180) / Math.PI;
        rotation = geometry.snap(rotation, event.shiftKey);
        Object.assign(
          item,
          geometry.rotate(old, geometry.angle(rotation), ratio),
        );
      } else Object.assign(item, geometry.resize(old, dx, dy, ratio));
      refresh();
    },
    { passive: false },
  );
  document.addEventListener("pointerup", (event) => {
    if (!gesture || gesture.pointer !== event.pointerId) return;
    const completed = gesture;
    gesture = null;
    panel.classList.remove("dragging");
    if (completed.type === "add") {
      if (completed.ghost) {
        completed.ghost.remove();
        insert(completed.asset, event);
      } else insertCentered(completed.asset);
    } else if (JSON.stringify(completed.before) !== JSON.stringify(state)) {
      history.record(completed.before, state);
      refresh();
      persist();
    }
  });
  document.addEventListener("pointercancel", () => {
    cancelGesture();
    refresh();
  });
  function remove() {
    if (selected === null) return;
    const before = copy(state);
    state[currentId()].splice(selected, 1);
    history.record(before, state);
    selected = null;
    refresh();
    persist();
  }
  const actions = {
    close: closeLibrary,
    done,
    library() {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) library();
    },
    delete: remove,
    undo() {
      travel("undo");
    },
    redo() {
      travel("redo");
    },
    save() {
      persist();
      const url = URL.createObjectURL(
        new Blob(
          [
            JSON.stringify(
              { version: 1, title: document.title, slides: state },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "image-placements.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      announce(Presentation.t("Placements saved."));
    },
    async source() {
      await sourceConnection;
      if (!sourceToken) {
        announce(
          Presentation.t(
            "Open this project with quarto preview to save to its Quarto source.",
          ),
        );
        return;
      }
      const id = currentId(),
        slide = deck.getCurrentSlide();
      const index = Number(
        slide.dataset.presentationSourceIndex ||
          slide.querySelector("[data-presentation-source-index]")?.dataset
            .presentationSourceIndex ||
          0,
      );
      if (!index && id !== "title-slide") {
        announce(
          Presentation.t(
            "This generated slide has no editable source heading.",
          ),
        );
        return;
      }
      const target = sourceIds.get(id) || id;
      const items = copy(state[id] || []).map((item) => ({
        ...item,
        ...(Math.abs(
          item.h -
            (item.w *
              contentRatio(id) *
              catalog.get(item.asset).preload.naturalHeight) /
              catalog.get(item.asset).preload.naturalWidth,
        ) > 0.00001
          ? { height: item.h * 100 }
          : {}),
        reference:
          item.asset.startsWith("lesson:") ? item.asset :
          item.asset.startsWith("global:") &&
          catalog.has(id + ":" + item.asset.slice(7))
            ? item.asset
            : item.asset.slice(item.asset.indexOf(":") + 1),
        asset: item.asset.startsWith(id + ":")
          ? target + item.asset.slice(id.length)
          : item.asset,
      }));
      const button = bar.querySelector("[data-library=source]");
      if (button.disabled) return;
      button.disabled = true;
      try {
        const response = await fetch("/__presentation/source", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Presentation-Token": sourceToken,
          },
          body: JSON.stringify({
            page: location.pathname,
            revision: source.revision,
            index,
            slide: target,
            images: items,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw Error(result.error);
        source.revision = result.revision;
        sourceIds.set(id, result.slide);
        prepared[id] = copy(state[id] || []);
        announce(
          sourceLiveReload
            ? Presentation.t("Saved to Quarto source. Preview is updating…")
            : Presentation.t(
                "Saved to Quarto source. Render again to update the presentation and PDF.",
              ),
        );
      } catch (error) {
        announce(error.message || Presentation.t("Source could not be saved."));
      } finally {
        button.disabled = false;
      }
    },
    restore() {
      const before = copy(state);
      state[currentId()] = copy(prepared[currentId()] || []);
      history.record(before, state);
      selected = null;
      refresh();
      persist();
      announce(Presentation.t("Prepared layout restored."));
    },
    load() {
      input.click();
    },
  };
  for (const element of [panel, bar])
    element.addEventListener("click", (event) => {
      const action = event.target.closest("[data-library]")?.dataset.library;
      if (action) actions[action]();
    });
  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      if (file.size > 1000000)
        throw Error(Presentation.t("Placement file is too large."));
      const { clean, skipped } = validate(JSON.parse(await file.text()));
      const before = copy(state);
      state = clean;
      history.record(before, state);
      selected = null;
      refresh();
      persist();
      announce(
        skipped
          ? Presentation.t("Loaded; unavailable images or slides were skipped.")
          : Presentation.t("Placements loaded."),
      );
    } catch (error) {
      announce(error.message);
    } finally {
      input.value = "";
    }
  });
  deck.on("slidechanged", close);
  deck.on("overviewshown", close);
  api.ready = Promise.all(
    [...catalog.values()].map((asset) =>
      asset.preload.decode().catch(() => {}),
    ),
  )
    .then(() => {
      for (const [id, layout] of Object.entries(prepared)) {
        if (layout.format !== "friendly" || !layers.has(id)) continue;
        const ratio = contentRatio(id);
        prepared[id] = layout.images.map((entry) => {
          const asset = catalog.has(id + ":" + entry.asset)
            ? id + ":" + entry.asset
            : /^(global|lesson):/.test(entry.asset)
              ? entry.asset
              : "global:" + entry.asset;
          if (!allowed(id, asset))
            throw Error("Unknown layout image: " + entry.asset);
          const image = catalog.get(asset).preload,
            w = (entry.width ?? 25) / 100;
          const h =
            entry.height !== undefined
              ? entry.height / 100
              : (w * ratio * image.naturalHeight) / image.naturalWidth;
          return geometry.fit(
            {
              asset,
              x: entry.x !== undefined ? entry.x / 100 : (1 - w) / 2,
              y: entry.y !== undefined ? entry.y / 100 : (1 - h) / 2,
              w,
              h,
              transparency: entry.transparency ?? 0,
              layer: entry.layer ?? 1,
              rotation: geometry.angle(entry.rotation ?? 0),
            },
            ratio,
          );
        });
      }
      state = validate({ version: 1, slides: prepared }).clean;
      for (const [id, items] of Object.entries(state))
        prepared[id] = copy(items);
      if (context.saved("images"))
        state = validate(context.saved("images")).clean;
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const data = JSON.parse(saved);
          if (
            !context.saved("images") &&
            data.revision === renderedRevision &&
            !new URLSearchParams(location.search).has("print-pdf")
          )
            state = validate(data).clean;
        }
      } catch {
        announce(
          Presentation.t(
            "Saved placements could not be restored; the prepared layout is shown.",
          ),
        );
      }
      refresh();
    })
    .catch((error) => {
      announce(error.message);
      console.error(error);
    });
  if (location.protocol.startsWith("http") && source.revision) {
    sourceConnection = fetch("/__presentation/source")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        sourceToken = data?.token || null;
        sourceLiveReload = !!data?.liveReload;
      })
      .catch(() => {});
  }
  function addDiscovered(entry) {
    const id = entry.scope + ':' + entry.id;
    if (catalog.has(id)) return id;
    // Explicitly configured images take precedence over automatic discovery.
    if ([...catalog.values()].some(asset => asset.src === entry.data && !asset.id.includes(':file:'))) return null;
    const preload = new Image(); preload.src = entry.data;
    catalog.set(id, {id, scope: entry.scope, src: entry.data, label: entry.label, preload});
    (entry.scope === 'lesson' ? lessonAssets : globals).push(id);
    return id;
  }
  async function assetRequest(data) {
    await sourceConnection;
    if (!sourceToken) throw Error(Presentation.t('Use quarto preview to import images.'));
    const response = await fetch('/__presentation/assets', {method:'POST', headers:{'Content-Type':'application/json','X-Presentation-Token':sourceToken}, body:JSON.stringify({page:location.pathname,...data})});
    const result = await response.json();
    if (!response.ok) throw Error(result.error || 'Image import failed.');
    return result;
  }
  async function refreshAssets() {
    if (!source.revision) return;
    try {
      const result = await assetRequest({action:'list'});
      result.assets.forEach(addDiscovered);
      if (!panel.hidden) library();
    } catch (error) { console.debug('Image catalog:', error.message); }
  }
  async function importImages(files, dropPoint) {
    const slide = currentId();
    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 12 * 1024 * 1024) throw Error(Presentation.t('Image is too large (maximum 12 MB).'));
        const url = URL.createObjectURL(file), img = new Image();
        let bytes;
        try {
          img.src = url; await img.decode();
          if (img.naturalWidth * img.naturalHeight > 32000000) throw Error(Presentation.t('Image dimensions are too large.'));
          const canvas = document.createElement('canvas');
          canvas.width=img.naturalWidth; canvas.height=img.naturalHeight;
          canvas.getContext('2d').drawImage(img,0,0);
          bytes=canvas.toDataURL('image/png').split(',')[1];
        } finally { URL.revokeObjectURL(url); }
        const result = await assetRequest({action:'import',name:file.name || 'clipboard',bytes});
        const asset = addDiscovered(result.asset) || [...catalog.values()].find(a=>a.src===result.asset.data)?.id;
        if (currentId() !== slide) { announce(Presentation.t('Image saved in assets.')); return; }
        const rect=layers.get(currentId()).getBoundingClientRect();
        await insert(asset,dropPoint || {clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2},true);
      }
      announce(Presentation.t('Image saved in assets. Save to Source keeps its placement in the document.'));
    } catch(error) { announce(error.message); }
  }
  const editableTarget = event => event.target.closest?.('input,textarea,[contenteditable="true"]');
  const importAllowed = event => !editableTarget(event) && ['standard','position'].includes(Presentation.modes.current());
  document.addEventListener('paste', event => {
    if (!importAllowed(event)) return;
    const files = [...(event.clipboardData?.files || [])].filter(file=>file.type.startsWith('image/'));
    if (!files.length) return;
    event.preventDefault(); importImages(files);
  });
  const reveal = deck.getRevealElement();
  reveal.addEventListener('dragover',event=>{
    if (importAllowed(event) && event.dataTransfer?.types.includes('Files')) event.preventDefault();
  });
  reveal.addEventListener('drop',event=>{
    if (!importAllowed(event)) return;
    const files=[...(event.dataTransfer?.files || [])].filter(file=>file.type.startsWith('image/'));
    if (!files.length) return;
    event.preventDefault();importImages(files,{clientX:event.clientX,clientY:event.clientY});
  });
  refresh();
  return Object.assign(api, {
    done,
    libraryOpen: () => !panel.hidden,
    undo: () => actions.undo(),
    redo: () => actions.redo(),
    remove,
  });
};
