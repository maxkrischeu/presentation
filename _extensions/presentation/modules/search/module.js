Presentation.register({
  id: "search",
  requires: ["frame"],
  interactiveOnly: true,
  setup({ deck, t, changed }) {
    let active = false, matches = [], current = -1;
    const controls = document.createElement("div");
    controls.className = "presentation-search-controls";
    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = t("Search...");
    input.setAttribute("aria-label", t("Search"));
    const status = document.createElement("span");
    status.setAttribute("role", "status");
    controls.append(input, status);
    function button(label, icon, action) {
      const el = document.createElement("button");
      el.type = "button";
      el.title = t(label);
      el.setAttribute("aria-label", t(label));
      el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>`;
      el.addEventListener("click", action);
      controls.append(el);
      return el;
    }
    const prev = button("Previous search result", '<path d="m14 5-7 7 7 7"/>', () => navigate(-1));
    const next = button("Next search result", '<path d="m10 5 7 7-7 7"/>', () => navigate(1));
    button("Done", '<path d="m4 12 5 5L20 6"/>', stop);
    function clear() {
      for (const mark of matches) {
        const parent = mark.parentNode;
        mark.replaceWith(document.createTextNode(mark.textContent));
        parent?.normalize();
      }
      matches = [];
      current = -1;
    }
    function update() {
      status.textContent = matches.length ? `${current + 1} / ${matches.length}` : input.value.trim() ? t("No search results") : "";
      prev.disabled = next.disabled = matches.length === 0;
    }
    function search() {
      clear();
      const query = input.value.trim();
      if (query) {
        // Escape regex syntax: searches are always literal, never executable patterns.
        const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu");
        for (const slide of deck.getSlides()) {
          const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
              return node.parentElement.closest('script,style,template,svg,canvas,header,footer,aside,nav,button,input,[role="status"]')
                ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
            },
          });
          const nodes = [];
          while (walker.nextNode()) nodes.push(walker.currentNode);
          for (const node of nodes) {
            const hits = [...node.data.matchAll(pattern)];
            if (!hits.length) continue;
            const fragment = document.createDocumentFragment();
            let offset = 0;
            for (const hit of hits) {
              fragment.append(document.createTextNode(node.data.slice(offset, hit.index)));
              const mark = document.createElement("mark");
              mark.className = "presentation-search-match";
              mark.textContent = hit[0];
              fragment.append(mark);
              matches.push(mark);
              offset = hit.index + hit[0].length;
            }
            fragment.append(document.createTextNode(node.data.slice(offset)));
            node.replaceWith(fragment);
          }
        }
      }
      update();
    }
    function navigate(direction) {
      if (!matches.length) return;
      matches[current]?.classList.remove("current");
      current = current < 0 ? (direction < 0 ? matches.length - 1 : 0)
        : (current + direction + matches.length) % matches.length;
      const mark = matches[current];
      mark.classList.add("current");
      const slide = mark.closest("section");
      const indices = deck.getIndices(slide);
      const fragment = mark.closest(".fragment");
      deck.slide(indices.h, indices.v, fragment ? Number(fragment.dataset.fragmentIndex) : -1);
      update();
    }
    function stop() {
      active = false;
      clear();
      input.value = "";
      input.blur();
      update();
      changed();
    }
    input.addEventListener("input", search);
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        navigate(event.shiftKey ? -1 : 1);
      } else if (event.key.toLowerCase() === "f" && event.shiftKey && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        event.stopPropagation();
        stop();
      }
    });
    deck.getRevealElement().addEventListener("click", event => {
      if (!active || !event.target.closest("section")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      stop();
    }, true);
    update();
    return {
      modes: [{
        id: "search", label: "Search", key: "S",
        icon: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
        enter() { active = true; changed(); requestAnimationFrame(() => input.focus()); },
        exit: stop, isActive: () => active,
      }],
      toolbar: { element: controls, modes: ["search"] },
    };
  },
});
