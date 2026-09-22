/* Keep upstream intact; defer its UI and WebAssembly runtime until first use. */
(() => {
  const plugin = window.RevealDrop;
  const initialize = plugin.init;
  let deck,
    started = false,
    previousKeyboard,
    rich = false,
    unread = false;
  const controls = document.createElement("div");
  controls.className = "presentation-python-controls";
  controls.hidden = true;
  const icons = {
    run: '<path d="m7 4 13 8-13 8Z"/>',
    rich: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M12 4v16 M3 12h9"/>',
    done: '<path d="m4 12 5 5L20 6"/>',
  };
  for (const [action, label] of [
    ["run", "Run"],
    ["rich", "Rich Output"],
    ["done", "Done Python Console"],
  ]) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.python = action;
    b.title = label;
    b.setAttribute("aria-label", label);
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[action]}</svg>`;
    controls.append(b);
  }
  plugin.controls = controls;
  function sync() {
    controls.hidden = !plugin.isActive();
    controls
      .querySelector("[data-python=rich]")
      .setAttribute("aria-pressed", String(rich));
    controls
      .querySelector("[data-python=rich]")
      .classList.toggle("has-output", unread);
    document
      .querySelector(".drop-clip")
      ?.classList.toggle("presentation-rich-output", rich);
    window.Presentation?.changed();
  }
  controls.addEventListener("click", (event) => {
    const action = event.target.closest("[data-python]")?.dataset.python;
    if (action === "done") plugin.close();
    if (action === "run")
      document.querySelector(".drop .editor-actions button")?.click();
    if (action === "rich") {
      rich = !rich;
      if (rich) unread = false;
      sync();
      window.dispatchEvent(new Event("resize"));
    }
  });
  document.addEventListener("presentation-rich-output", () => {
    if (!rich) unread = true;
    sync();
  });
  function decorate() {
    const editor = document.querySelector(".drop #editor"),
      terminal = document.querySelector(".drop #terminal"),
      plot = document.querySelector(".drop .plot-background");
    if (!editor || !terminal || !plot) return;
    const group = editor.parentElement,
      wrapper = group.parentElement,
      outer = wrapper.parentElement;
    document
      .querySelectorAll(".drop .editor-actions, .drop .close-button")
      .forEach((el) => Presentation.localize(el));
    group.classList.add("presentation-python-left-group");
    wrapper.classList.add("presentation-python-left");
    outer.classList.add("presentation-python-grid");
    plot.parentElement.classList.add("presentation-python-rich");
    sync();
  }
  plugin.init = (reveal) => {
    deck = reveal;
    Presentation.localize(controls);
  };
  plugin.close = () => {
    if (!plugin.isActive()) return;
    plugin.dropElement.classList.remove("active");
    document
      .querySelector(".drop-clip")
      ?.classList.remove("presentation-drop-open");
    document.body.classList.remove("presentation-python-active");
    document.activeElement?.blur?.();
    deck.configure({ keyboard: previousKeyboard });
    sync();
  };
  plugin.toggleDrop = () => {
    if (!deck || document.documentElement.classList.contains("print-pdf"))
      return;
    if (plugin.isActive()) return plugin.close();
    if (!started) {
      // Upstream's global shortcut listener uses a sentinel; Presentation owns input handling.
      const proxy = Object.create(deck);
      proxy.getConfig = () => ({
        ...deck.getConfig(),
        drop: {
          ...deck.getConfig().drop,
          shortcut: "Presentation_NO_KEY",
          button: false,
        },
      });
      proxy.addKeyBinding = () => {};
      initialize.call(plugin, proxy);
      const observer = new MutationObserver(() => {
        if (document.querySelector(".drop #editor")) {
          decorate();
          observer.disconnect();
        }
      });
      observer.observe(document.querySelector(".drop-clip"), {
        childList: true,
        subtree: true,
      });
      decorate();
      started = true;
    }

    previousKeyboard = deck.getConfig().keyboard;
    deck.configure({ keyboard: false });
    plugin.dropElement.classList.add("active");
    document
      .querySelector(".drop-clip")
      .classList.add("presentation-drop-open");
    document.body.classList.add("presentation-python-active");
    sync();
    window.dispatchEvent(new Event("resize"));
  };
})();
