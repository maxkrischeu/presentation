Presentation.mountHelp = function (context) {
  const { deck, t } = context;
  const update = () => {
    const search = document.querySelector(".searchinput");
    if (search) search.placeholder = t("Search...");
    const table = document.querySelector(".overlay-help table");
    if (!table || table.dataset.presentationKeys) return;
    table.dataset.presentationKeys = "true";
    const rows = [
      [
        "← / ↑ / → / ↓",
        t("Navigate slides (standard / overview / laser / magnifier)"),
      ],
    ];
    for (const command of Presentation.commands.values())
      if (command.key) rows.push([command.key, t(command.label)]);
    for (const module of Presentation.modules().values())
      for (const [key, label] of module.help || []) rows.push([key, t(label)]);
    rows.push(
      ["Ctrl/Cmd + Shift + F", t("Search")],
      ["Enter", t("Close panel, then exit working mode; fullscreen last")],
      ["Esc", t("Browser fullscreen exit")],
    );
    const body = document.createElement("tbody");
    for (const cells of rows) {
      const row = document.createElement("tr");
      for (const text of cells) {
        const cell = document.createElement("td");
        cell.textContent = text;
        row.append(cell);
      }
      body.append(row);
    }
    table.querySelectorAll("tbody").forEach((el) => el.remove());
    table.append(body);
    const note = document.createElement("p");
    note.textContent = t(
      "In text fields, Enter and letters remain text input. Use Close to leave the Python editor.",
    );
    table.after(note);
    Presentation.localize(table.closest(".overlay-help"));
  };
  new MutationObserver(update).observe(deck.getRevealElement(), {
    childList: true,
    subtree: true,
  });
};
