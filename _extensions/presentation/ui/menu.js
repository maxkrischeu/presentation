/* Reuses Reveal's animation and panel implementation, with registered commands. */
Presentation.mountMenu = function (context) {
  const { deck, t, invoke } = context;
  const menu = deck.getPlugin("menu"),
    panel = document.querySelector(".slide-menu");
  if (!menu || !panel) return;
  panel.id = "presentation-native-menu";
  function scrollFeedback(viewport, list) {
    let animation, touch, timer, offset = 0, scrollLimit = 0, suppressClickUntil = 0;
    const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
    const settle = () => {
      clearTimeout(timer);
      if (!offset) return;
      const from = offset;
      offset = 0;
      list.style.transform = "";
      animation?.cancel();
      if (!reducedMotion()) animation = list.animate([
        {transform: `translateY(${from}px)`}, {transform: "translateY(0)"},
      ], {duration: 220, easing: "ease-out"});
    };
    const rebound = delta => {
      if (reducedMotion()) return;
      // A trackpad sends many small deltas. Accumulate them instead of
      // restarting an animation from zero for every event.
      animation?.cancel();
      clearTimeout(timer);
      if (offset && Math.sign(offset) !== Math.sign(delta)) offset = 0;
      offset += delta * 0.3 * (1 - Math.abs(offset) / 22);
      offset = Math.max(-22, Math.min(22, offset));
      list.style.transform = `translateY(${offset}px)`;
      timer = setTimeout(settle, 130);
    };
    const atEdge = delta => {
      if (!offset) {
        animation?.cancel();
        scrollLimit = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
      }
      return delta > 0 ? viewport.scrollTop <= 1 : viewport.scrollTop >= scrollLimit - 1;
    };
    viewport.addEventListener("wheel", event => {
      if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
      const delta = -event.deltaY * unit;
      if (atEdge(delta)) {
        // Keep the translated list from creating real overflow at the edge.
        event.preventDefault();
        rebound(delta);
      } else settle();
      suppressClickUntil = Date.now() + 250;
    }, {passive: false});
    viewport.addEventListener("pointerdown", event => {
      touch = event.pointerType === "touch" ? {id: event.pointerId, y: event.clientY, lastY: event.clientY} : null;
    });
    viewport.addEventListener("pointermove", event => {
      if (!touch || event.pointerId !== touch.id) return;
      const delta = event.clientY - touch.y;
      if (Math.abs(delta) < 8) return;
      suppressClickUntil = Date.now() + 350;
      const step = event.clientY - touch.lastY;
      touch.lastY = event.clientY;
      if (atEdge(step)) rebound(step);
    }, {passive: true});
    for (const name of ["pointerup", "pointercancel"])
      viewport.addEventListener(name, () => { touch = null; settle(); });
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
