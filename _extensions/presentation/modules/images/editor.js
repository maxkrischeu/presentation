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
  const revealSources = new Map();
  function bindRevealSources() {
    revealSources.clear();
    for (const [id, items] of Object.entries(state)) {
      const available = new Set((prepared[id] || []).map((_, index) => index));
      // Sessions made before source IDs were stable contain random IDs. Match
      // those once on restore, without changing editor/history identities.
      const bind = (item, index) => {
        if (index < 0) return;
        revealSources.set(item._id, index);
        available.delete(index);
      };
      for (const item of items)
        bind(item, (prepared[id] || []).findIndex((entry, index) => available.has(index) && entry._id === item._id));
      for (const item of items.filter(item => !revealSources.has(item._id))) {
        const candidates = [...available].filter(index => prepared[id][index].asset === item.asset);
        const exact = candidates.find(index => ['x','y','w','h','rotation','layer','transparency'].every(key => prepared[id][index][key] === item[key]));
        bind(item, exact ?? candidates[0] ?? -1);
      }
      // Reset/restore may switch back to the original source objects.
      (prepared[id] || []).forEach((entry, index) => revealSources.set(entry._id, index));
    }
  }
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

      catalog.set(id, { id, scope, src: img.src, source: img.dataset.mediaSource || img.getAttribute("src"), label: img.alt, kind: img.dataset.mediaKind || "image", preload });
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
  panel.setAttribute("aria-label", Presentation.t("Media Library"));
  panel.dataset.preventSwipe = "true";
  panel.innerHTML =
    '<ol class="slide-menu-toolbar"><li class="toolbar-panel-button active-toolbar-button"><i class="fas fa-images" aria-hidden="true"></i><br><span class="slide-menu-toolbar-label">Media Library</span></li><li class="toolbar-panel-button"><button data-library="close" aria-label="Close Media Library"><i class="fas fa-times" aria-hidden="true"></i><br><span class="slide-menu-toolbar-label">Close</span></button></li></ol><div class="presentation-asset-tabs" role="tablist" aria-label="Media source"><button type="button" role="tab" id="presentation-assets-shared" data-asset-scope="shared" aria-controls="presentation-asset-catalog">Shared</button><button type="button" role="tab" id="presentation-assets-lesson" data-asset-scope="lesson" aria-controls="presentation-asset-catalog">This Lesson</button><button type="button" role="tab" id="presentation-assets-slide" data-asset-scope="slide" aria-controls="presentation-asset-catalog">This Slide</button></div><div class="presentation-asset-catalog" id="presentation-asset-catalog" role="tabpanel"></div>';
  const shell = document.createElement("div");
  shell.className = "slide-menu-wrapper presentation-assets-shell";
  const backdrop = document.createElement("div");
  backdrop.className = "presentation-asset-backdrop";
  backdrop.setAttribute("aria-hidden", "true");
  shell.append(backdrop, panel);
  const dismissLibrary = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!panel.hidden) closeLibrary();
  };
  backdrop.addEventListener("pointerdown", dismissLibrary);
  // WebKit can emit only click for the first interaction after a native drag.
  backdrop.addEventListener("click", dismissLibrary);
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
  bar.setAttribute("aria-label", Presentation.t("Media editing"));
  for (const [action, label] of [
    ["undo", Presentation.t("Undo")],
    ["redo", Presentation.t("Redo")],
    ["delete", Presentation.t("Delete Media")],
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
    field.setAttribute("aria-label", label);
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
        const sourceIndex = revealSources.get(item._id) ?? -1;
        const anchor = layer.parentElement.querySelector(`[data-presentation-image-step="${sourceIndex + 1}"]`);
        node._revealAnchor = anchor;
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
        const media = catalog.get(item.asset);
        const img = document.createElement(media.kind === 'video' ? 'video' : 'img');
        if (media.kind === 'video') {
          img.controls = !active;
          img.preload = 'auto';
          if (media.poster) img.poster = media.poster;
          videoPreview(media).then(() => {
            if (media.poster) img.poster = media.poster;
          }).catch(() => {});
          img.addEventListener('loadedmetadata', () => {
            if (!media.poster && img.paused) img.currentTime = Math.min(0.1, img.duration / 2 || 0);
          }, {once: true});
          img.playsInline = true;
          img.dataset.preventSwipe = 'true';
        }
        img.src = media.src;
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
          grip.setAttribute("aria-label", Presentation.t("Resize media"));
          target.append(grip);
          const handle = document.createElement("button");
          handle.className = "presentation-asset-rotate";
          handle.setAttribute("aria-label", Presentation.t("Rotate media"));
          handle.title = Presentation.t(
            "Rotate media · Snap: 45° · Shift: 15°",
          );
          // Anchored to the local image frame: the offset rotates with the image.
          if (media.kind !== 'video') target.append(handle);
        }
      });
    }
    if (gesture?.type === 'move' && gesture.guides) {
      const layer = layers.get(currentId());
      for (const [axis, position] of Object.entries(gesture.guides)) {
        const line = document.createElement('div');
        line.className = `presentation-alignment-guide presentation-alignment-${axis}`;
        line.setAttribute('aria-hidden', 'true');
        line.style[axis === 'x' ? 'left' : 'top'] = `${position * 100}%`;
        layer.append(line);
      }
    }
    const selectedItem = editing ? state[currentId()]?.[selected] : null;
    properties.hidden = !selectedItem;
    const videoSelected = selectedItem && catalog.get(selectedItem.asset)?.kind === 'video';
    for (const name of ['rotation', 'transparency']) fields[name].closest('label').hidden = !!videoSelected;
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
    updateImageVisibility();
    context.changed();
  }
  function updateImageVisibility() {
    for (const layer of [...layers.values(), ...backgrounds.values()]) {
      for (const node of layer.querySelectorAll('.presentation-placed-image')) {
        let anchor = node._revealAnchor;
        let concealed = false;
        while (anchor && anchor !== layer.parentElement) {
          if (anchor.classList.contains('fragment') && !anchor.classList.contains('visible')) concealed = true;
          anchor = anchor.parentElement;
        }
        node.classList.toggle('presentation-image-concealed', concealed && !editing && !armed);
      }
    }
  }
  deck.on('fragmentshown', updateImageVisibility);
  deck.on('fragmenthidden', updateImageVisibility);
  const previewObservers = [];
  function library() {
    previewObservers.splice(0).forEach(observer => observer.disconnect());
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
        button.draggable = true;
        button.title = asset.label;
        const img = document.createElement(asset.kind === 'video' ? 'span' : 'img');
        if (asset.kind === 'video') { img.className = 'presentation-media-video-preview'; img.textContent = '▶'; }
        else { img.loading = 'lazy'; img.src = asset.src; }
        img.alt = "";
        img.draggable = false;
        if (/\.gif(?:[?#]|$)/i.test(asset.src)) {
          img.addEventListener('load', () => {
            const still = document.createElement('canvas');
            still.width = img.naturalWidth; still.height = img.naturalHeight;
            still.style.cssText = 'width:100%;height:auto;display:block';
            still.getContext('2d').drawImage(img,0,0);
            if (!button.matches(':hover')) img.replaceWith(still);
            button.addEventListener('pointerenter', () => still.replaceWith(img));
            button.addEventListener('pointerleave', () => img.replaceWith(still));
          }, {once:true});
        }
        const label = document.createElement("span");
        label.textContent = asset.label;
        button.append(img, label);
        grid.append(button);
        if (asset.kind === 'video') {
          button.classList.add('presentation-video-tile');
          const observer = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            observer.disconnect();
            const preview = document.createElement('video');
            preview.muted = true; preview.playsInline = true; preview.preload = 'metadata';
            preview.addEventListener('loadedmetadata', () => { if (preview.duration > .1) preview.currentTime = .1; }, {once:true});
            preview.src = asset.src;
            img.replaceWith(preview);
          }, {root:container});
          observer.observe(img);
          previewObservers.push(observer);
        }
      }
    }
    if (!container.children.length) {
      const empty = document.createElement("p");
      empty.className = "presentation-asset-empty";
      const emptyMessages = {
        shared: "No shared media available.",
        lesson: "No media available for this lesson.",
        slide: "No media available for this slide.",
      };
      empty.textContent = Presentation.t(emptyMessages[libraryScope]);
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
      assets: [...new Set(Object.values(state).flat().map(item => item.asset))].map(id => {
        const asset=catalog.get(id), url=new URL(asset.src,location.href);
        return {id,kind:asset.kind,src:url.origin===location.origin ? url.pathname : asset.src,label:asset.label};
      }),
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
    let img;
    try {
      img = await loadMedia(catalog.get(asset));
    } catch {
      announce(Presentation.t("This media item could not be loaded."));
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
      Presentation.t("Media selected. Close the library to move or resize it."),
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
  // One visual library target, shared by pointer, keyboard and hold feedback.
  let libraryTarget = null, lastLibraryPointer = null;
  function highlightLibrary(button) {
    const target = gesture?.type === "add" && gesture.held ? gesture.button : button;
    if (target === libraryTarget) return;
    libraryTarget?.classList.remove("is-library-target");
    libraryTarget = target;
    libraryTarget?.classList.add("is-library-target");
  }
  panel.addEventListener("focusin", event => highlightLibrary(event.target.closest("[data-asset]")));
  panel.addEventListener("pointermove", event => {
    if (event.pointerType === "touch") return;
    if (lastLibraryPointer?.x === event.clientX && lastLibraryPointer?.y === event.clientY) return;
    lastLibraryPointer = {x: event.clientX, y: event.clientY};
    highlightLibrary(event.target.closest("[data-asset]"));
  });
  panel.addEventListener("pointerleave", () => highlightLibrary(null));
  let nativeDrag = null;
  function releaseLibraryHold(g) {
    clearTimeout(g.holdTimer);
    g.button?.classList.remove("is-held");
    if (panel.hasPointerCapture(g.pointer)) panel.releasePointerCapture(g.pointer);
  }
  function cancelGesture() {
    if (!gesture) return;
    if (gesture.before) {
      state = gesture.before;
      selected = null;
    }
    const canceled = gesture;
    gesture = null;
    releaseLibraryHold(canceled);
    canceled.ghost?.remove();
    restoreLibraryAfterDrag();
  }
  panel.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-asset]");
    if (!button || event.button !== 0 || !event.isPrimary) return;
    finishNativeDrag();
    cancelGesture();
    // Pointer interaction ends an old keyboard focus indication. The library
    // has no persistent selection; only the one currently held item is marked.
    if (panel.contains(document.activeElement)) document.activeElement.blur();
    highlightLibrary(button);
    event.stopPropagation();
    gesture = {
      type: "add",
      button,
      held: false,
      pointerType: event.pointerType,
      asset: button.dataset.asset,
      startX: event.clientX,
      startY: event.clientY,
      pointer: event.pointerId,
    };
    const pending = gesture;
    pending.holdTimer = setTimeout(() => {
      if (gesture !== pending || pending.ghost) return;
      pending.held = true;
      button.classList.add("is-held");
      highlightLibrary(button);
      panel.setPointerCapture(pending.pointer);
    }, 350);
  });
  function mediaDragPreview(button) {
    const source = button.querySelector("img, canvas, video");
    const width = source?.naturalWidth || source?.videoWidth || source?.width || 100;
    const height = source?.naturalHeight || source?.videoHeight || source?.height || 100;
    const scale = Math.min(180 / width, 140 / height, 1);
    const preview = document.createElement("canvas");
    preview.width = Math.max(1, Math.round(width * scale));
    preview.height = Math.max(1, Math.round(height * scale));
    preview.className = "presentation-asset-drag-preview";
    preview.setAttribute("aria-hidden", "true");
    Object.assign(preview.style, {position: "fixed", left: "0px", top: "0px",
      width: `${preview.width}px`, height: `${preview.height}px`, pointerEvents: "none"});
    try { if (source) preview.getContext("2d").drawImage(source, 0, 0, preview.width, preview.height); }
    catch { /* An unloaded preview remains transparent; never drag the label. */ }
    document.body.append(preview);
    return preview;
  }
  function restoreLibraryAfterDrag() {
    if (!panel.classList.contains("dragging")) return;
    // No slide-in animation here: the next tile must be immediately hittable.
    const transition = panel.style.transition;
    panel.style.transition = "none";
    panel.classList.remove("dragging");
    panel.getBoundingClientRect();
    panel.style.transition = transition;
  }
  const finishNativeDrag = () => {
    nativeDrag?.preview.remove();
    nativeDrag = null;
    restoreLibraryAfterDrag();
  };
  panel.addEventListener("dragstart", event => {
    const button = event.target.closest("[data-asset]");
    // WebKit can start the next native drag without a preceding Pointer Event.
    // dragstart itself is the browser's authoritative indication of intent.
    if (!button || !event.dataTransfer || gesture?.pointerType === "touch") {
      event.preventDefault();
      return;
    }
    const preview = mediaDragPreview(button);
    preview.style.left = `${event.clientX - preview.width / 2}px`;
    preview.style.top = `${event.clientY - preview.height / 2}px`;
    nativeDrag = {asset: button.dataset.asset, slide: currentId(), preview};
    event.dataTransfer.setDragImage(preview, preview.width / 2, preview.height / 2);
    event.dataTransfer.setData("text/plain", catalog.get(nativeDrag.asset).label);
    event.dataTransfer.effectAllowed = "copy";
    cancelGesture();
    requestAnimationFrame(() => {
      preview.remove();
      if (nativeDrag) panel.classList.add("dragging");
    });
  });
  document.addEventListener("dragover", event => {
    if (!nativeDrag) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });
  document.addEventListener("drop", event => {
    if (!nativeDrag) return;
    event.preventDefault();
    const completed = nativeDrag;
    finishNativeDrag();
    if (completed.slide === currentId()) insert(completed.asset, event);
  });
  document.addEventListener("dragend", finishNativeDrag);
  panel.addEventListener("contextmenu", event => {
    if (event.target.closest("[data-asset]")) event.preventDefault();
  });
  // touch-action cannot be changed during a gesture. Once held, prevent the
  // first native pan instead; ordinary, immediate swipes retain native scroll.
  document.addEventListener("touchmove", event => {
    if (gesture?.type === "add" && gesture.held && event.cancelable) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, {passive: false, capture: true});
  window.addEventListener("blur", cancelGesture);
  document.addEventListener("pointerdown", event => {
    if (gesture?.type === "add" && event.pointerId !== gesture.pointer) cancelGesture();
  }, true);
  panel.addEventListener("lostpointercapture", event => {
    if (gesture?.type === "add" && event.pointerId === gesture.pointer) cancelGesture();
  });
  // Sidecar can deliver scrolling as wheel events between pointer down/up.
  // Neither those sequences nor native touch scrolling are insert gestures.
  const cancelLibraryGesture = () => {
    if (gesture?.type === "add") cancelGesture();
    const focused = panel.querySelector("[data-asset]:focus-visible");
    highlightLibrary(focused);
  };
  panel.addEventListener("wheel", cancelLibraryGesture, {passive: true});
  panel.addEventListener("scroll", cancelLibraryGesture, true);
  const catalogViewport = panel.querySelector(".presentation-asset-catalog");
  Presentation.mountPanelScroll(catalogViewport,
    {onScroll: cancelLibraryGesture, isDragging: () => !!nativeDrag || !!gesture?.ghost});
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
      if (gesture.type === "add") {
        if (!gesture.ghost) {
          const dx = event.clientX - gesture.startX;
          const dy = event.clientY - gesture.startY;
          // A hold requires a stationary finger, not merely a slow swipe.
          if (!gesture.held && Math.hypot(dx, dy) > 4) clearTimeout(gesture.holdTimer);
          if (Math.hypot(dx, dy) < 8) return;
          // Desktop dragging is handled by the browser's drag/drop events.
          if (gesture.pointerType === "mouse") return;
          // The library sits on the right: only a deliberate drag toward the
          // slide inserts media. Vertical movement remains native scrolling.
          if (!gesture.held && (dx >= -8 || -dx < Math.abs(dy) * 1.3)) {
            cancelGesture();
            return;
          }
        }
        event.preventDefault();
        if (!gesture.ghost) {
          clearTimeout(gesture.holdTimer);
          const ghost = mediaDragPreview(gesture.button);
          ghost.classList.add("presentation-asset-ghost");
          gesture.ghost = ghost;
          panel.classList.add("dragging");
        }
        Object.assign(gesture.ghost.style, {
          left: event.clientX + "px",
          top: event.clientY + "px",
        });
        return;
      }
      event.preventDefault();
      const p = point(event),
        old = gesture.item,
        item = state[currentId()][gesture.index];
      const dx = p.x - gesture.start.x,
        dy = p.y - gesture.start.y;
      const ratio = contentRatio(currentId());
      if (gesture.type === "move") {
        const moved = geometry.fit({ ...old, x: old.x + dx, y: old.y + dy }, ratio);
        gesture.guides = {};
        if (event.altKey) Object.assign(item, moved);
        else {
          const slide = deck.getCurrentSlide().getBoundingClientRect();
          const center = {x: (slide.left + slide.width / 2 - p.rect.left) / p.rect.width,
                          y: (slide.top + slide.height / 2 - p.rect.top) / p.rect.height};
          const aligned = geometry.align(moved,
            state[currentId()].filter((_, index) => index !== gesture.index), ratio,
            {x: 6 / p.rect.width, y: 6 / p.rect.height}, center);
          Object.assign(item, aligned.item);
          gesture.guides = aligned.guides;
        }
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
    releaseLibraryHold(completed);
    restoreLibraryAfterDrag();
    document.querySelectorAll('.presentation-alignment-guide').forEach(line => line.remove());
    if (completed.type === "add") {
      if (completed.ghost) {
        completed.ghost.remove();
        insert(completed.asset, event);
      } else if (!completed.held) insertCentered(completed.asset);
    } else if (JSON.stringify(completed.before) !== JSON.stringify(state)) {
      history.record(completed.before, state);
      refresh();
      persist();
    }
  });
  document.addEventListener("pointercancel", () => {
    cancelGesture();
    if (!nativeDrag) refresh();
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
        height: item.h * 100,
        src: catalog.get(item.asset)?.source,
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
        bindRevealSources();
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
          ? Presentation.t("Loaded; unavailable media or slides were skipped.")
          : Presentation.t("Placements loaded."),
      );
    } catch (error) {
      announce(error.message);
    } finally {
      input.value = "";
    }
  });
  deck.on('slidechanged', () => {
    document.querySelectorAll('.presentation-placed-image video').forEach(video => video.pause());
    close();
  });
  deck.on('fragmenthidden', () => {
    document.querySelectorAll('.presentation-image-concealed video').forEach(video => video.pause());
  });
  deck.on("overviewshown", close);
  // Cache a decoded frame independently of the DOM nodes rebuilt by editing.
  function videoPreview(asset) {
    if (asset.previewPromise) return asset.previewPromise;
    asset.previewPromise = new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      const timer = setTimeout(() => finish(new Error('Video preview timed out.')), 15000);
      function finish(error) {
        clearTimeout(timer);
        video.onloadedmetadata = video.onseeked = video.onerror = null;
        video.removeAttribute('src');
        video.load();
        if (error) { asset.previewPromise = null; reject(error); }
        else resolve(asset.preload);
      }
      video.onloadedmetadata = () => {
        asset.preload = {naturalWidth: video.videoWidth, naturalHeight: video.videoHeight};
        video.currentTime = Math.min(0.1, video.duration / 2 || 0);
      };
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(1280, video.videoWidth);
          canvas.height = Math.round(canvas.width * video.videoHeight / video.videoWidth);
          canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
          asset.poster = canvas.toDataURL('image/jpeg', 0.85);
        } catch (_) { /* Remote media without CORS still use the decoded video frame. */ }
        finish();
      };
      video.onerror = () => finish(new Error('Video could not be loaded.'));
      video.src = asset.src;
    });
    return asset.previewPromise;
  }
  async function loadMedia(asset) {
    if (asset.loaded) return asset.preload;
    if (asset.kind === 'video') await videoPreview(asset);
    else { asset.preload.src = asset.src; await asset.preload.decode(); }
    asset.loaded = true;
    return asset.preload;
  }
  api.ready = Promise.resolve().then(async () => {
      // Load dimensions only for placements actually authored on slides.
      for (const [id, layout] of Object.entries(prepared)) {
        if (layout.format !== "friendly" || !layers.has(id)) continue;
        const ratio = contentRatio(id);
        prepared[id] = await Promise.all(layout.images.map(async (entry, index) => {
          const asset = catalog.has(id + ":" + entry.asset)
            ? id + ":" + entry.asset
            : /^(global|lesson):/.test(entry.asset)
              ? entry.asset
              : "global:" + entry.asset;
          if (!allowed(id, asset))
            throw Error("Unknown layout image: " + entry.asset);
          const image = await loadMedia(catalog.get(asset)),
            w = (entry.width ?? 25) / 100;
          const h =
            entry.height !== undefined
              ? entry.height / 100
              : (w * ratio * image.naturalHeight) / image.naturalWidth;
          return geometry.fit(
            {
              _id: `source:${id}:${index}`,
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
        }));
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
      bindRevealSources();
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
    const preload = new Image();
    catalog.set(id, {id, scope: entry.scope, src: entry.data || new URL(entry.src, location.href).href, source: entry.src, label: entry.label, kind: entry.kind || 'image', preload});
    (entry.scope === 'lesson' ? lessonAssets : globals).push(id);
    return id;
  }
  async function assetRequest(data) {
    await sourceConnection;
    if (!sourceToken) throw Error(Presentation.t('Use quarto preview to import media.'));
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
        if (!file.type.startsWith('image/') && !['video/mp4','video/webm'].includes(file.type)) continue;
        if (file.size > 12 * 1024 * 1024) throw Error(Presentation.t('Image is too large (maximum 12 MB).'));
        const url = URL.createObjectURL(file), img = new Image();
        let bytes;
        try {
          if (file.type === 'image/gif' || file.type.startsWith('video/')) {
            bytes = await new Promise((resolve,reject) => {const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
          } else {
          img.src = url; await img.decode();
          if (img.naturalWidth * img.naturalHeight > 32000000) throw Error(Presentation.t('Image dimensions are too large.'));
          const canvas = document.createElement('canvas');
          canvas.width=img.naturalWidth; canvas.height=img.naturalHeight;
          canvas.getContext('2d').drawImage(img,0,0);
          bytes=canvas.toDataURL('image/png').split(',')[1];
          }
        } finally { URL.revokeObjectURL(url); }
        const result = await assetRequest({action:'import',name:file.name || 'clipboard',bytes});
        const asset = addDiscovered(result.asset) || [...catalog.values()].find(a=>a.src===result.asset.data)?.id;
        if (currentId() !== slide) { announce(Presentation.t('Media saved in assets.')); return; }
        const rect=layers.get(currentId()).getBoundingClientRect();
        await insert(asset,dropPoint || {clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2},true);
      }
      announce(Presentation.t('Media saved in assets. Save to Source keeps its placement in the document.'));
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
    libraryElement: () => panel,
    libraryViewport: () => shell.getBoundingClientRect(),
    libraryScrollBy: delta => Presentation.scrollPanelBy(catalogViewport, delta),
    undo: () => actions.undo(),
    redo: () => actions.redo(),
    remove,
  });
};
