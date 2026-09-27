/* Native browser scrolling. Only gestures on the external grip need forwarding. */
Presentation.panelScrollers = new WeakMap();
Presentation.scrollPanelBy = (viewport, delta) => Presentation.panelScrollers.get(viewport)?.(delta);
Presentation.mountPanelScroll = function (viewport, options = {}) {
  let suppressClickUntil = 0;
  const scrolling = () => {
    options.onScroll?.();
    suppressClickUntil = Date.now() + 200;
  };
  Presentation.panelScrollers.set(viewport, delta => {
    scrolling();
    if (!options.isDragging?.()) viewport.scrollBy({top: delta, behavior: "instant"});
  });
  viewport.addEventListener("scroll", scrolling, {passive: true});
  // A new intentional click is allowed immediately; a scroll-generated click is not.
  viewport.addEventListener("pointerdown", () => { suppressClickUntil = 0; }, {passive: true});
  viewport.addEventListener("click", event => {
    if (event.detail && Date.now() < suppressClickUntil) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
};
