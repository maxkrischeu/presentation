Presentation.register({
  id: 'timer',
  requires: ['frame'],
  setup({ deck, t, print, saved }) {
    const controllers = [];
    const restored = new Map((saved('timer') || []).map(entry => [entry.id, entry]));
    const printMedia = window.matchMedia('print');
    const format = seconds => Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
    for (const [index, box] of [...deck.getSlidesElement().querySelectorAll('.presentation-timer')].entries()) {
      if (box.closest('.notes')) continue;
      const slide = box.closest('section');
      if (!slide) continue;
      const id = box.id || slide.id + ':timer-' + index;
      const duration = Number(box.dataset.timerSeconds) * 1000;
      if (!Number.isFinite(duration) || duration <= 0) throw Error('Invalid activity timer duration.');
      const clock = Presentation.factories.activityClock(duration);
      const initial = restored.get(id);
      let wanted = initial?.wanted === true, visited = initial?.visited === true, timeout;
      clock.restore(initial?.elapsed);
      const value = box.querySelector('.presentation-timer-value');
      const display = box.querySelector('.presentation-timer-display');
      const target = box.querySelector('.presentation-timer-target');
      const status = box.querySelector('.presentation-timer-status');
      const progress = box.querySelector('progress');
      const toggle = box.querySelector('.presentation-timer-toggle');
      const reset = box.querySelector('.presentation-timer-reset');
      const total = format(Math.ceil(duration / 1000));
      target.textContent = t('of {duration}', { duration: total });
      reset.textContent = t('Reset activity timer');
      progress.max = duration;
      progress.setAttribute('aria-label', t('Timer progress'));
      function render() {
        const elapsed = clock.read(), finished = elapsed >= duration;
        const seconds = box.dataset.timerDirection === 'down' ? Math.ceil((duration - elapsed) / 1000) : Math.floor(elapsed / 1000);
        value.textContent = format(seconds);
        display.setAttribute('aria-label', value.textContent + ' ' + target.textContent);
        progress.value = elapsed;
        const state = finished ? 'finished' : clock.running() ? 'running' : elapsed > 0 ? 'paused' : 'ready';
        box.dataset.state = state;
        const message = state === 'paused' ? t('Activity timer paused') : '';
        if (status.textContent !== message) status.textContent = message;
        toggle.textContent = t(finished ? 'Restart practice' : clock.running() ? 'Pause practice' : elapsed > 0 ? 'Resume practice' : 'Start practice');
        toggle.setAttribute('aria-pressed', String(clock.running()));
        toggle.disabled = reset.disabled = print;
      }
      function sync() {
        clearTimeout(timeout);
        const current = deck.getCurrentSlide() === slide;
        if (!print && current && !visited) {
          visited = true;
          if (box.dataset.timerAutostart === 'true') wanted = true;
        }
        // Switching browser tabs does not stop a classroom work phase.
        if (!print && !printMedia.matches && current && !deck.isOverview() && !deck.isPaused() && wanted) clock.start();
        else clock.pause();
        if (clock.read() >= duration) { clock.pause(); wanted = false; }
        render();
        if (clock.running()) timeout = setTimeout(sync, 100);
      }
      toggle.addEventListener('click', event => {
        event.stopPropagation();
        if (clock.read() >= duration) clock.reset();
        wanted = !clock.running(); visited = true; sync();
      });
      reset.addEventListener('click', event => {
        event.stopPropagation(); wanted = false; visited = true; clock.reset(); sync();
      });
      for (const event of ['ready', 'slidechanged', 'overviewshown', 'overviewhidden', 'paused', 'resumed']) deck.on(event, sync);
      printMedia.addEventListener('change', sync);
      controllers.push({
        snapshot: () => ({ id, elapsed: clock.read(), wanted, visited }),
        reset() { wanted = false; visited = true; clock.reset(); sync(); },
      });
      sync();
    }
    return {
      snapshot: () => controllers.map(controller => controller.snapshot()),
      reset: () => controllers.forEach(controller => controller.reset()),
    };
  }
});
