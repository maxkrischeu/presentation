const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = { Presentation: { factories: {} } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../clock.js'), 'utf8'), context);
const createClock = context.Presentation.factories.activityClock;

test('pause excludes interruption; delayed ticks still count real elapsed time', () => {
  let now = 0;
  const clock = createClock(600000, () => now);
  clock.start();
  now = 12345;
  assert.equal(clock.read(), 12345);
  clock.pause();
  now = 90000;
  assert.equal(clock.read(), 12345);
  clock.start();
  now = 180000;
  assert.equal(clock.read(), 102345);
  clock.start();
  assert.equal(clock.read(), 102345, 'starting twice must not lose elapsed time');
  now = 900000;
  assert.equal(clock.read(), 600000, 'completion never exceeds the target');
  clock.pause();
  clock.start();
  assert.equal(clock.running(), false, 'completed clock cannot restart without a reset');
});

test('reset and restoration produce a stopped clock with bounded values', () => {
  let now = 0;
  const clock = createClock(3000, () => now);
  clock.restore(1500);
  clock.start();
  now = 800;
  assert.equal(clock.read(), 2300);
  clock.reset();
  assert.equal(clock.read(), 0);
  assert.equal(clock.running(), false);
  clock.restore(Infinity);
  assert.equal(clock.read(), 0);
  clock.restore(-8);
  assert.equal(clock.read(), 0);
  clock.restore(5000);
  assert.equal(clock.read(), 3000);
});
