Presentation.register({
  id: 'tasks',
  requires: ['frame'],
  setup({ deck }) {
    const boxes = [...deck.getSlidesElement().querySelectorAll('.presentation-task-fill')];
    function layout() {
      for (const box of boxes) {
        const slide = box.closest('section');
        if (!slide || !box.getClientRects().length) continue;
        // offset geometry excludes Reveal's scale and fragment transitions.
        let top = 0;
        let node = box;
        while (node && node !== slide) {
          top += node.offsetTop;
          node = node.offsetParent;
        }
        if (node !== slide) continue;
        const bottom = parseFloat(getComputedStyle(slide).paddingBottom) || 0;
        const height = Math.max(0, slide.clientHeight - bottom - top);
        box.style.setProperty('--presentation-task-fill-height', `${height}px`);
      }
    }
    for (const event of ['ready', 'slidechanged', 'resize', 'overviewshown', 'overviewhidden']) {
      deck.on(event, layout);
    }
    const observer = new ResizeObserver(layout);
    for (const slide of new Set(boxes.map(box => box.closest('section')))) {
      if (slide) observer.observe(slide);
    }
    document.fonts?.ready.then(layout);
    layout();
    return {};
  }
});
