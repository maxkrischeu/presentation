/* A monotonic deadline avoids drift when the browser delays a tick. */
Presentation.factories.quizClock = function (seconds, now = () => performance.now()) {
  const duration = seconds * 1000;
  let remaining = duration, deadline = null;
  const read = () => deadline === null ? remaining : Math.max(0, deadline - now());
  return {
    read,
    running: () => deadline !== null,
    start() { if (deadline === null && remaining > 0) deadline = now() + remaining; },
    pause() { remaining = read(); deadline = null; },
    reset() { remaining = duration; deadline = null; },
    restore(value) {
      deadline = null;
      remaining = Number.isFinite(value) ? Math.max(0, Math.min(duration, value)) : duration;
    },
  };
};

/* One timer belongs to one question; question controllers own assessment. */
Presentation.factories.quizTimer = function ({ deck, slide, seconds, ready, answered, onExpire }) {
  if (!seconds || new URLSearchParams(location.search).has("print-pdf") ||
      document.documentElement.classList.contains("print-pdf")) return null;
  const heading = slide.querySelector("h1,h2,h3");
  if (!heading) return null;
  const clock = Presentation.factories.quizClock(seconds);
  const print = window.matchMedia("print");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "quiz-timer";
  button.dataset.presentationNavigation = "local";
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6m-3 0v3"/></svg><span class="quiz-timer-value" aria-hidden="true"></span><span class="quiz-timer-action" aria-hidden="true"></span>';
  heading.classList.add("quiz-heading-timed");
  heading.append(button);
  const label = button.querySelector(".quiz-timer-value");
  const action = button.querySelector(".quiz-timer-action");
  let paused = false, finished = false, timeout;
  const eligible = () => deck.getCurrentSlide() === slide && ready() &&
    !deck.isOverview() && !deck.isPaused() && !document.hidden && !print.matches;
  function render() {
    const left = Math.ceil(clock.read() / 1000);
    const text = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
    label.textContent = text;
    button.dataset.state = finished ? "finished" : paused ? "paused" : clock.running() ? "running" : "waiting";
    button.classList.toggle("quiz-timer-urgent", left <= 10 && clock.running() && !finished);
    button.disabled = finished;
    action.textContent = finished ? (left === 0 ? "■" : "✓") : paused ? "▶" : "Ⅱ";
    const description = Presentation.t(finished ? (left === 0 ? "Time is up" : "Answer submitted") :
      paused ? "Resume quiz timer" : clock.running() ? "Pause quiz timer" : "Timer starts when all answers are visible");
    button.title = description;
    button.setAttribute("aria-label", description + ": " + text);
    button.setAttribute("aria-pressed", String(paused));
  }
  function sync() {
    clearTimeout(timeout);
    if (finished || answered() || paused || !eligible()) clock.pause();
    else clock.start();
    if (!finished && !answered() && eligible() && !paused && clock.read() <= 0) {
      finished = true;
      clock.pause();
      render();
      onExpire();
      return;
    }
    render();
    if (clock.running()) timeout = setTimeout(sync, Math.min(200, clock.read()));
  }
  button.addEventListener("click", event => {
    event.stopPropagation();
    if (finished) return;
    paused = !paused;
    sync();
  });
  for (const event of ["ready", "slidechanged", "fragmentshown", "fragmenthidden", "overviewshown", "overviewhidden", "paused", "resumed"])
    deck.on(event, sync);
  document.addEventListener("visibilitychange", sync);
  print.addEventListener("change", sync);
  sync();
  return {
    finish() { finished = true; clock.pause(); clearTimeout(timeout); render(); },
    reset() { finished = false; paused = false; clock.reset(); sync(); },
    snapshot: () => ({ remaining: clock.read(), paused, finished }),
    restore(saved) {
      if (!saved) return;
      clock.restore(saved.remaining);
      paused = saved.paused === true;
      finished = saved.finished === true || answered();
      sync();
    },
  };
};
