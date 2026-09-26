-- Prepare the project-local hook without depending on a feature module.
function Meta(meta)
  local directory = pandoc.path.directory(PANDOC_SCRIPT_FILE)
  local paths = dofile(pandoc.path.join({directory, '../core/paths.lua'}))
  local root, input = paths()
  pandoc.pipe('quarto', {'run', pandoc.path.join({directory, 'register.ts'}), root, input, PANDOC_STATE.input_files[1] or ''}, '')
  return meta
end
