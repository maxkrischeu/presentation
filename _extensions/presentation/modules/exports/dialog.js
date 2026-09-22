/* One immutable session snapshot for every export target. */
Presentation.factories.exports = function (context) {
  const { deck } = context;
  const dialog = document.createElement("dialog");
  dialog.className = "presentation-export-dialog";
  dialog.innerHTML = `<form method="dialog"><h2>Export Slides PDF</h2>
    <div class="presentation-export-options">
      <fieldset><legend>Scope</legend>
        <label><input name="scope" type="radio" value="current" checked> Current state</label>
        <label><input name="scope" type="radio" value="custom"> Custom</label>
      </fieldset>
      <div class="presentation-export-custom" hidden>
        <fieldset><legend>Slide state</legend>
          <label><input name="content" type="radio" value="current" checked> Current</label>
          <label><input name="content" type="radio" value="prepared"> Prepared</label>
        </fieldset>
        <label><input name="drawings" type="checkbox" checked> Include slide drawings</label>
        <label class="presentation-export-hidden"><input name="hidden" type="checkbox"> Also include hidden drawings</label>
        <label><input name="boards" type="checkbox" checked> Include chalkboard pages</label>
      </div>
    </div><p class="presentation-export-description"></p><p role="status"></p>
    <footer><button value="cancel">Cancel</button><button type="button" data-export>Download</button></footer></form>`;
  Presentation.localize(dialog);
  document.body.append(dialog);
  let kind = "slides";
  const form = dialog.querySelector("form"),
    status = dialog.querySelector("[role=status]"),
    button = dialog.querySelector("[data-export]");
  const field = (name) => form.elements.namedItem(name);
  const update = () => {
    dialog.querySelector(".presentation-export-custom").hidden = field("scope").value !== "custom";
    field("hidden").disabled = !field("drawings").checked;
  };
  form.addEventListener("change", update);
  // A modal owns its keys; presentation shortcuts must not escape into the deck.
  window.addEventListener(
    "keydown",
    (event) => {
      if (dialog.open) event.stopImmediatePropagation();
    },
    true,
  );
  const capture = () => Presentation.session.capture();
  const open = (type) => {
    kind = type;
    status.textContent = "";
    button.disabled = false;
    dialog.querySelector("h2").textContent = {
      slides: Presentation.t("Export Slides PDF"),
      chalkboard: Presentation.t("Export Chalkboard PDF"),
      presentation: Presentation.t("Export Presentation"),
    }[kind];
    dialog.querySelector(".presentation-export-options").hidden =
      kind !== "slides";
    const description = dialog.querySelector(".presentation-export-description");
    description.hidden = kind === "slides";
    description.textContent =
      kind === "slides"
        ? ""
        : kind === "chalkboard"
          ? Presentation.t(
              "All non-empty boards, including hidden drawings · A4 landscape",
            )
          : Presentation.t(
              "ZIP with the current images, drawings and quiz state, plus local presentation resources.",
            );
    field("scope").value = "current";
    field("content").value = "current";
    field("drawings").checked = true;
    field("boards").checked = true;
    field("hidden").checked = false;
    update();
    dialog.showModal();
  };
  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = Presentation.t("Preparing export… On first use, export components are downloaded.");
    try {
      const snapshot = await capture();
      const custom = kind === "slides" && field("scope").value === "custom";
      const auth = await fetch("/__presentation/source");
      if (!auth.ok)
        throw Error(
          Presentation.t(
            "Open this project with quarto preview to export the current session.",
          ),
        );
      const { token } = await auth.json();
      const response = await fetch("/__presentation/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Presentation-Token": token,
        },
        body: JSON.stringify({
          page: location.pathname,
          kind,
          snapshot,
          options: {
            content: custom ? field("content").value : "current",
            images: true,
            drawings: custom ? field("drawings").checked : true,
            hidden: custom && field("drawings").checked && field("hidden").checked,
            boards: custom ? field("boards").checked : true,
          },
        }),
      });
      if (!response.ok)
        throw Error(
          (await response.json()).error || Presentation.t("Export failed."),
        );
      const blob = await response.blob(),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download =
        decodeURIComponent(location.pathname.split("/").pop()).replace(
          /\.html?$/i,
          "",
        ) +
        (kind === "presentation"
          ? "-session.zip"
          : kind === "chalkboard"
            ? "-chalkboard.pdf"
            : "-slides.pdf");
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      status.textContent = Presentation.t("Export ready.");
    } catch (error) {
      status.textContent = Presentation.t(error.message);
    } finally {
      button.disabled = false;
    }
  });
  return { open, capture };
};
