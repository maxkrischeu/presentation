export async function exportInputs(
  args = Deno.args,
  env = Deno.env.toObject(),
) {
  if (args.length) return args;
  let list: string;
  if (env.QUARTO_USE_FILE_FOR_PROJECT_OUTPUT_FILES) {
    list = await Deno.readTextFile(
      env.QUARTO_USE_FILE_FOR_PROJECT_OUTPUT_FILES,
    );
  } else if (env.QUARTO_PROJECT_OUTPUT_FILES !== undefined) {
    list = env.QUARTO_PROJECT_OUTPUT_FILES;
  } else {throw Error(
      "No outputs specified. Use quarto render or pass HTML files to quarto run modules/exports/render.ts.",
    );}
  return list.split(/\r?\n/).filter((file) => file.trim().length > 0);
}
