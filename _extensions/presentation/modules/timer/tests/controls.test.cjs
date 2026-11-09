const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness() {
  let now = 0, nextId = 0, definition, clock;
  const timeouts = new Map(), events = new Map();
  const node = () => {
    let text = '';
    const attributes = new Map(), listeners = new Map();
    return {
      textWrites: 0,
      get textContent() { return text; },
      set textContent(value) { this.textWrites++; text = value; },
      setAttribute: (name, value) => attributes.set(name, String(value)),
      getAttribute: name => attributes.get(name) ?? null,
      addEventListener: (name, listener) => listeners.set(name, listener),
      click: () => listeners.get('click')({ stopPropagation() {} }),
    };
  };
  const slide = { id: 'test-slide' };
  const nodes = Object.fromEntries(['value', 'display', 'target', 'status', 'toggle', 'reset'].map(name => ['.presentation-timer-' + name, node()]));
  nodes.progress = node();
  const box = {
    id: 'test-clock',
    dataset: { timerSeconds: '600', timerDirection: 'up', timerAutostart: 'true' },
    closest: selector => selector === 'section' ? slide : null,
    querySelector: selector => nodes[selector],
  };
  const deck = {
    getSlidesElement: () => ({ querySelectorAll: () => [box] }),
    getCurrentSlide: () => slide,
    isOverview: () => false,
    isPaused: () => false,
    on(name, fn) { events.set(name, fn); },
  };
  const context = {
    performance: { now: () => now },
    window: { matchMedia: () => ({ matches: false, addEventListener() {} }) },
    setTimeout(fn) { timeouts.set(++nextId, fn); return nextId; },
    clearTimeout(id) { timeouts.delete(id); },
    Presentation: { factories: {}, register(value) { definition = value; } },
  };
  vm.createContext(context);
  for (const file of ['clock.js', 'timer.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  const createClock = context.Presentation.factories.activityClock;
  context.Presentation.factories.activityClock = (...args) => clock = createClock(...args);
  const api = definition.setup({ deck, t: key => key, print: false, saved: () => undefined });
  return {
    box, clock, api, toggle: nodes['.presentation-timer-toggle'], value: nodes['.presentation-timer-value'],
    tick(ms) { now += ms; const pending = [...timeouts.values()]; timeouts.clear(); pending.forEach(fn => fn()); },
    sync: () => events.get('resumed')(),
  };
}

test('running ticks preserve the button label and displayed second until they change', () => {
  const h = harness();
  const labelWrites = h.toggle.textWrites, timeWrites = h.value.textWrites;
  for (let i = 0; i < 5; i++) h.tick(100);
  assert.equal(h.toggle.textWrites, labelWrites, 'ticks must not replace the clickable label');
  assert.equal(h.value.textWrites, timeWrites, 'the unchanged displayed second stays intact');
});

test('Pause cancels the run request even if the clock is temporarily stopped', () => {
  const h = harness();
  h.tick(250);
  h.clock.pause();
  h.toggle.click();
  assert.equal(h.clock.running(), false);
  assert.equal(h.api.snapshot()[0].wanted, false);
  h.sync();
  assert.equal(h.clock.running(), false, 'a later lifecycle event must not undo Pause');
});

test('one click pauses until another click explicitly resumes', () => {
  const h = harness();
  h.tick(1000);
  h.toggle.click();
  const elapsed = h.clock.read();
  h.tick(5000); h.sync();
  assert.equal(h.clock.read(), elapsed);
  assert.equal(h.box.dataset.state, 'paused');
  h.toggle.click(); h.tick(1000);
  assert.equal(h.clock.read(), elapsed + 1000);
});
