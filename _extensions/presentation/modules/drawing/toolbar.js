Presentation.factories.drawingToolbar = function (context, adapter) {
  const paths = {
    lasso: '<ellipse cx="12" cy="9" rx="9" ry="6" stroke-dasharray="3 2"/><path d="M7 14c-4 6 5 9 5 4 0-2-3-3-5-2"/>',
    colors:
      '<circle cx="8" cy="8" r="4.5" style="fill:#3973bc;stroke:#fff;stroke-width:1"/><circle cx="16" cy="8" r="4.5" style="fill:#e44b55;stroke:#fff;stroke-width:1"/><circle cx="12" cy="16" r="4.5" style="fill:#f2c438;stroke:#fff;stroke-width:1"/>',
    strokeEraser:
      Presentation.drawingIcons.eraser + '<path d="M17 3h4m-2-2v4"/>',
    eraseAll:
      '<path d="m3 12 8-9 7 6-8 9H6Z M7 7l7 6 M16 16l6 6 M22 16l-6 6"/>',
    done: '<path d="m4 12 5 5L20 6"/>',
    prev: '<path d="m14 5-7 7 7 7"/>',
    next: '<path d="m10 5 7 7-7 7"/>',
    overview:
      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    draw: Presentation.drawingIcons.pen,
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    board:
      '<rect x="3" y="4" width="18" height="13" rx="1"/><path d="M8 21l4-4 4 4"/>',
    visible:
      '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    hide: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M3 3l18 18"/>',
    clear: Presentation.drawingIcons.eraser,
    download: '<path d="M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5 M12 17h.01"/>',
  };
  const icon = (key) =>
    `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[key]}</svg>`;
  const drawingTools = document.createElement("div");
  drawingTools.className = "presentation-drawing-controls";
  drawingTools.hidden = true;
  const tool = (action, label, glyph) =>
    `<button type="button" data-drawing="${action}" title="${label}" aria-label="${label}">${icon(glyph)}</button>`;
  drawingTools.innerHTML =
    tool("visibility", Presentation.t("Show / Hide Drawings"), "hide") +
    tool("colors", Presentation.t("Pen / Colors"), "draw") +
    tool("lasso", Presentation.t("Lasso Selection"), "lasso") +
    tool("eraser", Presentation.t("Eraser"), "clear") +
    tool(
      "clear",
      Presentation.t("Clear All Drawings on This Slide / Board"),
      "eraseAll",
    ) +
    tool("download", Presentation.t("Export Chalkboard PDF"), "download") +
    tool("previousBoard", Presentation.t("Previous Board"), "prev") +
    tool("nextBoard", Presentation.t("Next Board"), "next") +
    `<button type="button" class="presentation-drawing-done" data-drawing="done" title="Back to Presentation" aria-label="Done Drawing">${icon("done")}</button>`;
  const palette = document.createElement("div");
  palette.className = "presentation-dock-palette";
  palette.hidden = true;
  palette.setAttribute("role", "group");
  palette.setAttribute("aria-label", Presentation.t("Pen Color"));
  const eraserOptions = document.createElement("div");
  eraserOptions.className =
    "presentation-dock-palette presentation-eraser-options";
  eraserOptions.hidden = true;
  eraserOptions.setAttribute("role", "group");
  eraserOptions.setAttribute("aria-label", Presentation.t("Eraser Type"));
  eraserOptions.innerHTML =
    '<button type="button" data-eraser-mode="pixel">Pixel Eraser</button><button type="button" data-eraser-mode="stroke">Stroke Eraser</button>';
  Presentation.localize(drawingTools);
  Presentation.localize(eraserOptions);
  drawingTools.append(palette, eraserOptions);
  let drawingMode = "";
  const update = () => {
    const mode = adapter.boarding()
      ? "board"
      : adapter.drawing()
        ? "notes"
        : "";
    if (mode !== drawingMode) {
      palette.hidden = true;
      eraserOptions.hidden = true;
      palette.replaceChildren();
      drawingMode = mode;
      if (mode)
        adapter.colors().forEach(({ index, color, label: colorLabel }) => {
          const swatch = document.createElement("button");
          swatch.type = "button";
          swatch.dataset.color = index;
          const label =
            colorLabel ||
            [
              Presentation.t("Black"),
              Presentation.t("Blue"),
              Presentation.t("Red"),
              Presentation.t("Green"),
              Presentation.t("Orange"),
              Presentation.t("Purple"),
              Presentation.t("Yellow"),
            ][index] ||
            Presentation.t("Color {number}", { number: index + 1 });
          swatch.title = label;
          swatch.setAttribute("aria-label", label);
          const dot = document.createElement("span");
          dot.style.backgroundColor = color;
          swatch.append(dot);
          palette.append(swatch);
        });
    }
    const visibility = drawingTools.querySelector("[data-drawing=visibility]");
    const shown = adapter.drawingsVisible();
    visibility.innerHTML = icon(shown ? "visible" : "hide");
    visibility.setAttribute(
      "aria-label",
      shown ? Presentation.t("Hide Drawings") : Presentation.t("Show Drawings"),
    );
    visibility.title = shown
      ? Presentation.t("Hide Drawings")
      : Presentation.t("Show Drawings");
    drawingTools
      .querySelector("[data-drawing=colors]")
      .setAttribute("aria-expanded", String(!palette.hidden));
    drawingTools
      .querySelector("[data-drawing=colors]")
      .setAttribute("aria-pressed", String(!adapter.erasing() && !adapter.selecting()));
    drawingTools.querySelector("[data-drawing=lasso]").setAttribute("aria-pressed", String(adapter.selecting()));
    const eraserButton = drawingTools.querySelector("[data-drawing=eraser]");
    eraserButton.setAttribute("aria-pressed", String(adapter.erasing() && !adapter.selecting()));
    eraserButton.setAttribute("aria-expanded", String(!eraserOptions.hidden));
    const strokeEraser = adapter.eraserMode() === "stroke";
    eraserButton.innerHTML = icon(strokeEraser ? "strokeEraser" : "clear");
    eraserButton.title = strokeEraser
      ? Presentation.t("Stroke Eraser")
      : Presentation.t("Pixel Eraser");
    eraserButton.setAttribute("aria-label", eraserButton.title);
    eraserOptions
      .querySelectorAll("button")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.eraserMode === adapter.eraserMode()),
        ),
      );
    drawingTools
      .querySelectorAll(
        "[data-drawing=previousBoard],[data-drawing=nextBoard],[data-drawing=download]",
      )
      .forEach((el) => (el.hidden = mode !== "board"));
  };
  drawingTools.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    event.stopPropagation();
    if (button.dataset.eraserMode) {
      adapter.setEraserMode(button.dataset.eraserMode);
      eraserOptions.hidden = true;
      palette.hidden = true;
    } else if (button.dataset.color !== undefined) {
      adapter.color(Number(button.dataset.color));
      palette.hidden = true;
    } else {
      const action = button.dataset.drawing;
      if (action === "colors") {
        eraserOptions.hidden = true;
        const switching = adapter.erasing() || adapter.selecting();
        const open = palette.hidden;
        adapter.pen();
        palette.hidden = switching || !open;
      } else if (action === "eraser") {
        const switching = !adapter.erasing();
        const open = eraserOptions.hidden;
        palette.hidden = true;
        adapter.color(-1);
        eraserOptions.hidden = switching || !open;
      } else {
        palette.hidden = true;
        eraserOptions.hidden = true;
        if (action === "done") adapter.stop();
        else adapter[action]?.();
      }
    }
    update();
  });
  update();
  return {
    element: drawingTools,
    modes: ["draw", "board"],
    update,
    paletteOpen: () => !palette.hidden || !eraserOptions.hidden,
    closePalette() {
      palette.hidden = true;
      eraserOptions.hidden = true;
      update();
    },
    choose(tool) {
      drawingTools.querySelector(`[data-drawing=${tool}]`).click();
    },
  };
};
