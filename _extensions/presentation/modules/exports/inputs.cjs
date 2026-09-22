const {readFile} = require('node:fs/promises');

// An empty Quarto render pass has no outputs; it must not select a sample deck.
async function exportInputs(args = process.argv.slice(2), env = process.env) {
  if (args.length) return args;
  let list;
  if (env.QUARTO_USE_FILE_FOR_PROJECT_OUTPUT_FILES) {
    list = await readFile(env.QUARTO_USE_FILE_FOR_PROJECT_OUTPUT_FILES, 'utf8');
  } else if (env.QUARTO_PROJECT_OUTPUT_FILES !== undefined) {
    list = env.QUARTO_PROJECT_OUTPUT_FILES;
  } else {
    throw new Error('Keine Ausgabedateien angegeben. Bitte quarto render verwenden oder HTML-Dateien übergeben: npm run export:pdf -- _output/deine-datei.html');
  }
  return list.split(/\r?\n/).filter(file => file.trim().length > 0);
}

module.exports = {exportInputs};
