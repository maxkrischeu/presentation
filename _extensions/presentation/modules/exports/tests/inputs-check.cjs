const {test} = require('node:test');
const assert = require('node:assert/strict');
const {mkdtemp, writeFile, rm} = require('node:fs/promises');
const {tmpdir} = require('node:os');
const {join} = require('node:path');
const {exportInputs} = require('../inputs.cjs');

test('empty incremental render does not export the example', async () => {
  assert.deepEqual(await exportInputs([], {QUARTO_PROJECT_OUTPUT_FILES: ''}), []);
});
test('output paths preserve spaces and accept CRLF', async () => {
  assert.deepEqual(await exportInputs([], {QUARTO_PROJECT_OUTPUT_FILES: '_output/Meine Folien.html\r\n_output/zweite.html\r\n'}), ['_output/Meine Folien.html', '_output/zweite.html']);
});
test('Quarto output-list file takes precedence over inherited environment', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'presentation-inputs-'));
  try {
    const file = join(dir, 'output list.txt');
    await writeFile(file, '_output/Unterricht.html\n');
    const env = {QUARTO_USE_FILE_FOR_PROJECT_OUTPUT_FILES: file, QUARTO_PROJECT_OUTPUT_FILES: '_output/stale.html'};
    assert.deepEqual(await exportInputs([], env), ['_output/Unterricht.html']);
    await writeFile(file, '');
    assert.deepEqual(await exportInputs([], env), []);
    assert.deepEqual(await exportInputs(['explicit.html'], env), ['explicit.html']);
  } finally { await rm(dir, {recursive:true, force:true}); }
});
test('missing output information gives actionable error', async () => {
  await assert.rejects(exportInputs([], {}), /quarto render/);
  await assert.rejects(exportInputs([], {QUARTO_USE_FILE_FOR_PROJECT_OUTPUT_FILES: '/nonexistent/presentation-output-list'}), {code:'ENOENT'});
});
