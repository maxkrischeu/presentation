/* All knowledge of Chalkboard's DOM is confined to this adapter.
   Quarto's bundled Chalkboard 2.3.3 exposes commands but no notes-mode getter. */
Presentation.factories.drawing = function (context) {
  const { deck, changed: onChange } = context;
  const plugin = deck.getPlugin("RevealChalkboard");
  const notes = document.getElementById("notescanvas");
  const board = document.getElementById("chalkboard");
  const drawing = () => !!notes && notes.style.pointerEvents !== "none";
  const penColors = { notes: 0, board: 0 };
  const drawingsShown = {
    ...{ notes: true, board: true },
    ...context.saved("drawing")?.visibility,
  };
  const boarding = () => !!board && board.style.visibility === "visible";
  const clearSelection = () => window.getSelection()?.removeAllRanges();
  let drawingActive = false;
  // Safari can select the whole transparent canvas on a double tap. Keep
  // selection handling on the drawing surfaces, leaving other UI untouched.
  for (const layer of [notes, board].filter(Boolean)) {
    layer.addEventListener("pointerdown", () => {
      if (drawing() || boarding()) clearSelection();
    });
    for (const name of ["selectstart", "dblclick"]) {
      layer.addEventListener(name, (event) => {
        if (!drawing() && !boarding()) return;
        event.preventDefault();
        clearSelection();
      });
    }
  }
  // Chalkboard's canvases already carry data-prevent-swipe. Changing Reveal's
  // configuration here would re-sync slides and interrupt Chalkboard playback.
  const sync = () => {
    const active = drawing() || boarding();
    deck.getRevealElement().classList.toggle("presentation-drawing-active", active);
    if (active && !drawingActive) clearSelection();
    drawingActive = active;
    deck
      .getRevealElement()
      .classList.toggle("presentation-notes-hidden", !drawingsShown.notes);
    for (const [name, layer] of [
      ["notes", notes],
      ["board", board],
    ]) {
      const canvas = layer?.querySelector("canvas");
      const opacity = drawingsShown[name] ? "1" : "0";
      if (canvas && canvas.style.opacity !== opacity)
        canvas.style.opacity = opacity;
      const file = canvas?.style.cursor.match(
        /(?:boardmarker-[a-z]+|chalk-[a-z]+|sponge)\.png/,
      )?.[0];
      if (file && Presentation.drawingCursors[file]) {
        canvas.dataset.presentationCursor = file;
        canvas.style.cursor = `url("${Presentation.drawingCursors[file]}"), crosshair`;
      }
    }
    onChange();
  };
  const observer = new MutationObserver(sync);
  [notes, board, notes?.querySelector("canvas"), board?.querySelector("canvas")]
    .filter(Boolean)
    .forEach((el) =>
      observer.observe(el, { attributes: true, attributeFilter: ["style"] }),
    );
  // Cache notes inside their owning slide for the overview. Copy pixels directly
  // rather than encoding images during the mode switch.
  let captureTimer;
  const captureNotes = () => {
    clearTimeout(captureTimer);
    const source = notes?.querySelector("canvas");
    const slide = deck.getCurrentSlide();
    if (!source || !slide || boarding()) return;
    let preview = slide.querySelector(":scope > .presentation-notes-preview");
    if (!preview) {
      preview = document.createElement("canvas");
      preview.className = "presentation-notes-preview";
      preview.setAttribute("aria-hidden", "true");
      slide.append(preview);
    }
    const config = deck.getConfig();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    preview.width = Math.round(config.width * ratio);
    preview.height = Math.round(config.height * ratio);
    const viewport = deck.getRevealElement().getBoundingClientRect();
    const width = Math.min(
      viewport.width,
      (viewport.height * config.width) / config.height,
    );
    const height = (width * config.height) / config.width;
    const left = viewport.left + (viewport.width - width) / 2;
    const top = viewport.top + (viewport.height - height) / 2;
    const sx = source.width / innerWidth,
      sy = source.height / innerHeight;
    preview
      .getContext("2d")
      .drawImage(
        source,
        left * sx,
        top * sy,
        width * sx,
        height * sy,
        0,
        0,
        preview.width,
        preview.height,
      );
  };
  // Touch/pen input can also emit pointer and mouse events. Copy once after
  // the stroke, and postpone if the next stroke has already started.
  document.addEventListener("pointerdown", () => clearTimeout(captureTimer));
  // Mouse and touch strokes, including erasing, finish before their bubbling events.
  ["mouseup", "touchend", "pointerup"].forEach((name) =>
    document.addEventListener(name, () => {
      clearTimeout(captureTimer);
      captureTimer = setTimeout(() => {
        if (drawing() && !deck.isOverview()) captureNotes();
      }, 100);
    }),
  );
  const stop = () => {
    if (drawing() && !deck.isOverview()) captureNotes();
    if (boarding()) plugin.toggleChalkboard();
    if (drawing()) plugin.toggleNotesCanvas();
    sync();
  };
  sync();
  return {
    captureNotes,
    visibilityState: () => ({ ...drawingsShown }),
    snapshot: () => ({
      drawingData: JSON.parse(plugin.getData()),
      drawings: plugin.exportPages(),
      visibility: { ...drawingsShown },
    }),
    resetSession() {
      stop();
      plugin?.resetAll(true);
      drawingsShown.notes = true;
      drawingsShown.board = true;
      document
        .querySelectorAll(".presentation-notes-preview")
        .forEach((el) => el.remove());
      sync();
    },
    available: !!plugin && !!notes && !!board,
    drawing,
    boarding,
    stop,
    drawingsVisible() {
      return drawingsShown[boarding() ? "board" : "notes"];
    },
    visibility() {
      const name = boarding() ? "board" : "notes";
      drawingsShown[name] = !drawingsShown[name];
      sync();
    },
    colors() {
      // Native board palette always lists chalk colors, even when whiteboard
      // actually draws with the same markers as Notes Canvas.
      const chalk =
        boarding() && deck.getConfig().chalkboard?.theme !== "whiteboard";
      return Array.from(
        (chalk ? board : notes)?.querySelectorAll(".palette [data-color]") ||
          [],
        (el) => ({
          index: Number(el.dataset.color),
          color: el.style.color,
          label:
            Number(el.dataset.color) === 0
              ? chalk
                ? Presentation.t("White")
                : Presentation.t("Black")
              : null,
        }),
      );
    },
    eraserMode() {
      return plugin.getEraserMode();
    },
    setEraserMode(value) {
      plugin.setEraserMode(value);
      plugin.colorIndex(-1);
      sync();
    },
    pen() {
      plugin?.colorIndex(penColors[boarding() ? "board" : "notes"]);
      sync();
    },
    color(index) {
      if (index >= 0) penColors[boarding() ? "board" : "notes"] = index;
      plugin?.colorIndex(index);
      sync();
    },
    erasing() {
      return !!(boarding() ? board : notes)
        ?.querySelector("canvas")
        ?.dataset.presentationCursor?.includes("sponge");
    },
    previousBoard() {
      board?.querySelector("#previousboard")?.click();
    },
    nextBoard() {
      board?.querySelector("#nextboard")?.click();
    },
    draw() {
      if (!plugin) return;
      if (boarding()) plugin.toggleChalkboard();
      notes.style.visibility = "visible";
      plugin.toggleNotesCanvas();
      sync();
    },
    board() {
      if (!plugin) return;
      if (drawing()) plugin.toggleNotesCanvas();
      plugin.toggleChalkboard();
      sync();
    },
    hide() {
      drawingsShown.notes = !drawingsShown.notes;
      sync();
    },
    clear() {
      plugin?.clear();
      if (!boarding()) captureNotes();
    },
    download() {
      if (boarding()) context.invoke("chalkboardPdf");
    },
  };
};
