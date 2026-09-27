Presentation.register({
  id: "tap-navigation",
  requires: ["shell"],
  interactiveOnly: true,
  setup({ deck }) {
    // Also accept primary mouse clicks: Sidecar may translate finger taps to them.
    const local = 'a, button, input, textarea, select, video, audio, iframe, embed, object, summary, [role="button"], [role="link"], [tabindex], [contenteditable]:not([contenteditable="false"]), [draggable="true"], [data-prevent-swipe], [data-presentation-keyboard="local"], [data-presentation-navigation="local"]';
    let press = null;
    let middleClick = null;
    const eligible = target => {
      const slide = deck.getCurrentSlide();
      return Presentation.modes?.current() === "standard" &&
        !Presentation.modes.panelOpen() && !deck.isOverview() &&
        slide?.contains(target) && !target.closest?.(local);
    };
    document.addEventListener("pointerdown", event => {
      press = event.isPrimary && event.button === 0 && eligible(event.target) ? {
        id: event.pointerId, x: event.clientX, y: event.clientY,
        time: performance.now(), slide: deck.getCurrentSlide(),
      } : null;
    }, true);
    document.addEventListener("pointermove", event => {
      if (press && event.pointerId === press.id &&
          Math.hypot(event.clientX - press.x, event.clientY - press.y) > 12) press = null;
    }, true);
    for (const name of ["pointercancel", "dragstart", "fullscreenchange", "webkitfullscreenchange"])
      document.addEventListener(name, () => { press = null; middleClick = null; }, true);
    window.addEventListener("blur", () => { press = null; middleClick = null; });
    document.addEventListener("click", event => {
      const start = press;
      press = null;
      const previousMiddleClick = middleClick;
      middleClick = null;
      if (!start || event.defaultPrevented || event.button !== 0 ||
          event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
          performance.now() - start.time > 600 ||
          Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12 ||
          start.slide !== deck.getCurrentSlide() || !eligible(event.target) ||
          !window.getSelection()?.isCollapsed) return;
      const rect = start.slide.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) return;
      const position = (event.clientX - rect.left) / rect.width;
      if (position >= 1 / 3 && position <= 2 / 3) {
        // Sidecar can emit two ordinary clicks instead of a native dblclick.
        // Invoke fullscreen during the second trusted click's user activation.
        const doubleTap = previousMiddleClick?.slide === start.slide &&
          event.timeStamp - previousMiddleClick.time <= 500 &&
          Math.hypot(event.clientX - previousMiddleClick.x, event.clientY - previousMiddleClick.y) <= 32;
        if (doubleTap && !document.fullscreenElement && !document.webkitFullscreenElement) {
          event.preventDefault();
          Presentation.modes.invoke("fullscreen");
        } else {
          middleClick = {slide: start.slide, time: event.timeStamp, x: event.clientX, y: event.clientY};
        }
        return;
      }
      event.preventDefault();
      if (position < 1 / 3) deck.prev();
      else deck.next();
    });
    return {};
  },
});
