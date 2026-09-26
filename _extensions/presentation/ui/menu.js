/* Reuses Reveal's animation and panel implementation, with registered commands. */
Presentation.mountMenu = function (context) {
  const { deck, t, invoke } = context;
  const menu = deck.getPlugin("menu"),
    panel = document.querySelector(".slide-menu");
  if (!menu || !panel) return;
  panel.id = "presentation-native-menu";
  function scrollFeedback(viewport, list) {
    let animation, touch, suppressClickUntil = 0;
    const rebound = delta => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      animation?.cancel();
      const distance = Math.sign(delta) * Math.min(18, Math.abs(delta) * 0.25);
      animation = list.animate([
        {transform: "translateY(0)"},
        {transform: `translateY(${distance}px)`, offset: 0.3},
        {transform: "translateY(0)"},
      ], {duration: 300, easing: "ease-out"});
    };
    const atEdge = delta => delta > 0 ? viewport.scrollTop <= 1 :
      viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 1;
    viewport.addEventListener("wheel", event => {
      if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      // Cancel any previous transform before measuring real scroll boundaries.
      animation?.cancel();
      const delta = -event.deltaY;
      if (atEdge(delta)) rebound(delta);
      suppressClickUntil = Date.now() + 250;
    }, {passive: true});
    viewport.addEventListener("pointerdown", event => {
      touch = event.pointerType === "touch" ? {id: event.pointerId, y: event.clientY} : null;
    });
    viewport.addEventListener("pointermove", event => {
      if (!touch || event.pointerId !== touch.id) return;
      const delta = event.clientY - touch.y;
      if (Math.abs(delta) < 8) return;
      suppressClickUntil = Date.now() + 350;
      animation?.cancel();
      if (atEdge(delta)) rebound(delta);
    }, {passive: true});
    for (const name of ["pointerup", "pointercancel"])
      viewport.addEventListener(name, () => { touch = null; });
    viewport.addEventListener("click", event => {
      if (Date.now() < suppressClickUntil) {
        event.preventDefault(); event.stopImmediatePropagation();
      }
    }, true);
  }
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
    scrollFeedback(list.closest(".slide-menu-panel"), list);
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
