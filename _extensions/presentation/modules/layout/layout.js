Presentation.register({
  id: 'layout',
  requires: ['frame'],
  setup({ deck }) {
    for (const box of deck.getSlidesElement().querySelectorAll('.vcenter')) {
      if (box.closest('.notes')) continue;
      const slide = box.closest('section');
      if (!slide || slide.querySelector(':scope > section')) continue;
      slide.classList.add('presentation-vcenter-slide');
      // Fragment groups and other enclosing divs must pass on the free space.
      // Normal flow handles font changes, resizing and PDF without measurements.
      for (let parent = box.parentElement; parent && parent !== slide; parent = parent.parentElement) {
        parent.classList.add('presentation-vcenter-parent');
      }
    }
    return {};
  }
});
