/* Shared boundary feedback for scrollable panels; owners supply their content. */
Presentation.scrollFeedback = function (viewport, content, options = {}) {
  const getContent = () => typeof content === "function" ? content() : content;
  let animation, touch, timer, offset = 0, scrollLimit = 0, suppressClickUntil = 0;
  const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const settle = () => {
    clearTimeout(timer);
    if (!offset) return;
    const from = offset;
    offset = 0;
    const list = getContent();
    if (!list) return;
    list.style.transform = "";
    animation?.cancel();
    if (!reducedMotion()) animation = list.animate([
      {transform: `translateY(${from}px)`}, {transform: "translateY(0)"},
    ], {duration: 220, easing: "ease-out"});
  };
  const rebound = delta => {
    if (reducedMotion()) return;
    const list = getContent();
    if (!list) return;
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
    if (options.isDragging?.() || event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    options.onScroll?.();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
    const delta = -event.deltaY * unit;
    if (atEdge(delta)) {
      // Keep the translated list from creating real overflow at the edge.
      event.preventDefault();
      rebound(delta);
    } else settle();
    suppressClickUntil = Date.now() + 250;
  }, {passive: false});
  // Native scrolling cancels Pointer Events. Touch Events continue through
  // the gesture, including a fresh outward swipe at an existing boundary.
  viewport.addEventListener("touchstart", event => {
    touch = event.touches.length === 1 ? {y: event.touches[0].clientY, lastY: event.touches[0].clientY} : null;
  }, {passive: true});
  viewport.addEventListener("touchmove", event => {
    if (!touch || event.touches.length !== 1 || event.defaultPrevented || options.isDragging?.()) return;
    const y = event.touches[0].clientY;
    if (Math.abs(y - touch.y) < 8) return;
    const step = y - touch.lastY;
    touch.lastY = y;
    suppressClickUntil = Date.now() + 350;
    options.onScroll?.();
    if (atEdge(step)) {
      if (event.cancelable) event.preventDefault();
      rebound(step);
    } else settle();
  }, {passive: false});
  for (const name of ["touchend", "touchcancel"])
    viewport.addEventListener(name, () => { touch = null; settle(); }, {passive: true});
  viewport.addEventListener("click", event => {
    if (Date.now() < suppressClickUntil) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
};
