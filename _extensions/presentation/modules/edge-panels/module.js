/* Panels own their DOM and side; this module owns only the drag surfaces. */
Presentation.register({
  id: "edge-panels",
  requires: ["frame"],
  interactiveOnly: true,
  setup({deck, invoke, changed}) {
    let gesture = null, suppressClickUntil = 0, wheelTimer, frame, trackUntil = 0;
    const handles = new Map();
    const allowed = () => Presentation.modes?.current() === "standard" &&
      !document.querySelector("dialog[open]");

    function finish(cancel = false) {
      clearTimeout(wheelTimer);
      const g = gesture;
      gesture = null;
      if (!g) return;
      if (g.pointerId !== undefined && g.handle.hasPointerCapture(g.pointerId))
        g.handle.releasePointerCapture(g.pointerId);
      if (g.dragging) {
        const commit = !cancel && g.distance >= Math.min(72, g.width * 0.24);
        if (g.opening ? !commit : commit) g.panel.close();
        g.element.style.transition = g.transition;
        g.element.style.transform = g.transform;
        suppressClickUntil = Date.now() + 350;
        changed();
      }
      place();
    }

    function begin(event, panel, handle) {
      if (!allowed() || event.button !== 0 || !event.isPrimary) return;
      if (gesture) { finish(true); return; }
      event.preventDefault();
      event.stopImmediatePropagation();
      const opening = !panel.isOpen();
      gesture = {
        panel, handle, element: panel.edge.element(), opening,
        pointerId: event.pointerId, x: event.clientX, y: event.clientY,
        direction: (panel.edge.side === "left" ? 1 : -1) * (opening ? 1 : -1),
        dragging: false, distance: 0,
      };
      handle.setPointerCapture(event.pointerId);
    }

    // Follow native panel transitions as well as direct dragging. Observe the
    // owner and its wrapper, including closes initiated by the owner's buttons.
    function track() {
      trackUntil = performance.now() + 450;
      if (frame) return;
      const tick = () => {
        place();
        frame = performance.now() < trackUntil ? requestAnimationFrame(tick) : null;
      };
      frame = requestAnimationFrame(tick);
    }
    function place() {
      for (const panel of Presentation.panels.values()) {
        if (!panel.edge) continue;
        let surfaces = handles.get(panel.id);
        if (!surfaces) {
          surfaces = [0, 1].map(() => {
            const handle = document.createElement("div");
            handle.className = "presentation-edge-grip";
            handle.dataset.edgePanel = panel.id;
            handle.dataset.preventSwipe = "true";
            handle.setAttribute("aria-hidden", "true");
            handle.addEventListener("pointerdown", event => begin(event, panel, handle));
            handle.addEventListener("wheel", event => wheel(event, panel, handle), {passive: false});
            // Reveal still listens to legacy Touch Events. These gestures
            // belong to the grip, never to slide navigation or media dragging.
            for (const name of ["touchstart", "touchmove", "touchend"])
              handle.addEventListener(name, event => event.stopPropagation(), {passive: true});
            document.body.append(handle);
            return handle;
          });
          handles.set(panel.id, surfaces);
          const element = panel.edge.element();
          if (element) {
            const observer = new MutationObserver(track);
            observer.observe(element, {attributes: true, attributeFilter: ["class", "style", "hidden"]});
            if (element.parentElement) observer.observe(element.parentElement,
              {attributes: true, attributeFilter: ["class", "style", "hidden"]});
            element.addEventListener("transitionrun", track);
            element.addEventListener("transitionend", track);
          }
        }
        const element = panel.edge.element();
        const visible = allowed() && !!element;
        const open = panel.isOpen();
        const side = panel.edge.side;
        const stage = panel.edge.viewport();
        const bounds = element?.getBoundingClientRect();
        const browserEdge = side === "left" ? 0 : innerWidth;
        const slideEdge = side === "left" ? stage.left : stage.right;
        // Closed: accept both the browser edge and the slide edge in letterbox
        // layouts. Open: move the grip to the panel's inner edge for closing.
        const moving = open || (bounds && (side === "left"
          ? bounds.right > stage.left + 1 : bounds.left < stage.right - 1));
        const edges = moving ? [side === "left" ? bounds.right : bounds.left] :
          Math.abs(browserEdge - slideEdge) > 40 ? [browserEdge, slideEdge] : [browserEdge];
        // Keep the captured surface alive when starting at the slide edge.
        const ordered = gesture?.panel === panel
          ? [gesture.handle, ...surfaces.filter(handle => handle !== gesture.handle)] : surfaces;
        ordered.forEach((handle, index) => {
          handle.hidden = !visible || index >= edges.length;
          if (handle.hidden) return;
          const boundary = edges[index];
          const left = Math.max(0, Math.min(innerWidth - 36,
            moving ? boundary - 18 : side === "left" ? boundary : boundary - 36));
          Object.assign(handle.style, {
            left: `${left}px`, top: "0px", height: `${innerHeight}px`,
          });
          handle.dataset.edgeSide = side;
          handle.classList.toggle("is-open", open);
        });
      }
    }

    function move(event) {
      const g = gesture;
      if (!g || event.pointerId !== g.pointerId) return;
      if (!allowed()) { finish(true); return; }
      const dx = event.clientX - g.x, dy = event.clientY - g.y;
      const inward = dx * g.direction;
      if (!g.dragging && !g.opening && g.panel.edge.scrollBy &&
          (g.scrolling || (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)))) {
        event.preventDefault(); event.stopImmediatePropagation();
        g.panel.edge.scrollBy((g.lastY ?? g.y) - event.clientY);
        g.lastY = event.clientY;
        g.scrolling = true;
        return;
      }
      if (!g.dragging) {
        if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { finish(true); return; }
        if (inward < -12) { finish(true); return; }
        if (inward < 6 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
        if (g.opening) invoke(g.panel.edge.command);
        if (!g.panel.isOpen()) { finish(true); return; }
        g.width = g.element.getBoundingClientRect().width;
        g.transition = g.element.style.transition;
        g.transform = g.element.style.transform;
        g.element.style.transition = "none";
        g.dragging = true;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      g.distance = Math.max(0, Math.min(g.width, inward));
      const hidden = g.opening ? g.width - g.distance : g.distance;
      g.element.style.transform = `translateX(${(g.panel.edge.side === "left" ? -1 : 1) * hidden}px)`;
      place();
    }
    window.addEventListener("pointermove", event => {
      if (gesture?.pointerId !== undefined) move(event);
    }, {capture: true, passive: false});
    // Sidecar may translate a finger pan into trackpad scrolling, rather than
    // touch/pointer dragging. Consume only horizontal scrolling on a grip.
    function wheel(event, panel, handle) {
      if (!allowed() || event.ctrlKey) return;
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX) && panel.isOpen() && panel.edge.scrollBy) {
        if (gesture) finish();
        event.preventDefault(); event.stopPropagation();
        panel.edge.scrollBy(event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1));
        return;
      }
      if (Math.abs(event.deltaX) < Math.abs(event.deltaY) * 1.2 || !event.deltaX) return;
      if (gesture && gesture.pointerId !== undefined) return;
      if (gesture && gesture.panel !== panel) finish(true);
      if (!gesture) {
        const opening = !panel.isOpen();
        const direction = (panel.edge.side === "left" ? 1 : -1) * (opening ? 1 : -1);
        if (-event.deltaX * direction <= 0) return;
        gesture = {panel, handle, element: panel.edge.element(), opening,
          x: event.clientX, y: event.clientY, direction,
          dragging: false, distance: 0, wheelX: 0};
      }
      const g = gesture;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerWidth : 1;
      g.wheelX -= event.deltaX * unit;
      event.preventDefault();event.stopPropagation();
      move({pointerId: undefined, clientX: g.x + g.wheelX, clientY: g.y,
        preventDefault() {}, stopImmediatePropagation() {}});
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => finish(), 180);
    }
    // A wheel sequence stays with its original grip even as that grip moves.
    window.addEventListener("wheel", event => {
      if (gesture && gesture.pointerId === undefined) {
        wheel(event, gesture.panel, gesture.handle);
        event.stopImmediatePropagation();
      }
    }, {capture: true, passive: false});
    window.addEventListener("pointerup", event => {
      if (gesture?.pointerId !== event.pointerId) return;
      event.preventDefault(); event.stopImmediatePropagation(); finish();
    }, true);
    window.addEventListener("pointercancel", event => {
      if (gesture?.pointerId === event.pointerId) finish(true);
    }, true);
    window.addEventListener("lostpointercapture", event => {
      if (gesture?.pointerId === event.pointerId) finish(true);
    }, true);
    window.addEventListener("pointerdown", event => {
      if (gesture && event.pointerId !== gesture.pointerId) finish(true);
    }, true);
    document.addEventListener("close", () => place(), true);
    window.addEventListener("blur", () => finish(true));
    const resize = () => { finish(true); place(); };
    window.addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", resize);
    document.addEventListener("webkitfullscreenchange", resize);
    window.visualViewport?.addEventListener("resize", resize);
    window.addEventListener("click", event => {
      if (Date.now() < suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    deck.on("slidechanged", () => finish(true));
    deck.on("resize", () => requestAnimationFrame(place));
    Presentation.subscribe(() => {
      if (gesture && !allowed()) finish(true);
      place();
      track();
    });
    return {};
  },
});
