/* Reuses Reveal's animation and panel implementation, with registered commands. */
Presentation.mountMenu = function (context) {
  const { deck, t, invoke } = context;
  const menu = deck.getPlugin("menu"),
    panel = document.querySelector(".slide-menu");
  if (!menu || !panel) return;
  panel.id = "presentation-native-menu";
  const targets = [
    ["Slides", "utilities", "Utilities"],
    ["Custom0", "modes", "Modes"],
  ];
  for (const [target, group, label] of targets) {
    const tab = panel.querySelector(
      `.slide-menu-toolbar [data-panel=${target}]`,
    );
    tab.querySelector(".slide-menu-toolbar-label").textContent = t(label);
    tab.title = t(label);
    tab.setAttribute("aria-label", t(label));
    if (group === "utilities")
      tab.querySelector("i").outerHTML =
        '<svg class="presentation-utilities-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6V3h6v3 M3 7h18v14H3Z M3 12h18 M9 10v4 M15 10v4"/></svg>';
    const list = panel.querySelector(
      `.slide-menu-panel[data-panel=${target}] .slide-menu-items`,
    );
    list.closest(".slide-menu-panel").classList.add("slide-menu-custom-panel");
    list.replaceChildren();
    Presentation.scrollFeedback(list.closest(".slide-menu-panel"), list);
    const commands = [...Presentation.commands.values()]
      .filter((c) => c.menu === group)
      .sort((a, b) =>
        t(a.label).localeCompare(t(b.label), Presentation.language),
      );
    commands.forEach((command, index) => {
      const item = document.createElement("li");
      item.className = "slide-tool-item";
      item.dataset.item = index;
      const link = document.createElement("a");
      link.href = "#";
      link.dataset.presentationAction = command.id;
      if (command.key) {
        const key = document.createElement("kbd");
        key.textContent = command.key.toLowerCase();
        link.append(key, " ");
      }
      link.append(document.createTextNode(t(command.label)));
      link.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        menu.closeMenu();
        invoke(command.id);
      });
      item.append(link);
      list.append(item);
    });
  }
  Presentation.localize(panel);
};
