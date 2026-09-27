Presentation.register({
  id: "text-selection",
  requires: ["frame"],
  interactiveOnly: true,
  setup({ deck, t, changed }) {
    const root = deck.getRevealElement();
    const slides = root.querySelector(".slides");
    const editable = 'input, textarea, [contenteditable]:not([contenteditable="false"]), [role="textbox"]';
    let active = false;
    const clear = () => {
      const selection = window.getSelection();
      if (slides.contains(selection?.anchorNode) || slides.contains(selection?.focusNode))
        selection.removeAllRanges();
    };
    root.classList.add("presentation-selection-managed");
    clear();
    slides.addEventListener("selectstart", event => {
      const target = event.target.nodeType === Node.ELEMENT_NODE ? event.target : event.target.parentElement;
      if (!active && !target.closest(editable)) event.preventDefault();
    });
    slides.addEventListener("dragstart", event => {
      if (event.target.matches?.("img") && !event.target.closest('[draggable="true"]')) event.preventDefault();
    });
    function stop() {
      active = false;
      root.classList.remove("presentation-selecting-text");
      clear();
      changed();
    }
    const controls = document.createElement("div");
    controls.className = "presentation-selection-controls";
    const label = document.createElement("span");
    label.textContent = t("Select Text");
    const done = document.createElement("button");
    done.type = "button";
    done.title = t("Finish Text Selection");
    done.setAttribute("aria-label", done.title);
    done.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 5 5L20 6"/></svg>';
    done.addEventListener("click", stop);
    controls.append(label, done);
    return {
      modes: [{
        id: "text-selection", label: "Select Text", key: "A", menuOrder: 95,
        icon: '<path d="M8 3h8M12 3v18M8 21h8M4 7H2v10h2M20 7h2v10h-2"/>',
        enter() { active = true; root.classList.add("presentation-selecting-text"); changed(); },
        exit: stop, isActive: () => active,
      }],
      toolbar: { element: controls, modes: ["text-selection"] },
    };
  },
});
