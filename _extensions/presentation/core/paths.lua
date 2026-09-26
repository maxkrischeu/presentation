-- Resolve source/project paths consistently for render and single-file preview.
return function()
  local input = quarto.doc.input_file
  local input_dir = pandoc.path.directory(pandoc.path.normalize(pandoc.path.is_absolute(input) and input or pandoc.path.join({pandoc.system.get_working_directory(), input})))
  local root = quarto.project.directory or os.getenv('QUARTO_PROJECT_DIR')
  -- Single-file preview may omit both project context values. Resolve the
  -- nearest Quarto project from the source, never from the configured assets.
  if not root then
    local candidate = input_dir
    while candidate and candidate ~= '' do
      for _, name in ipairs({'_quarto.yml', '_quarto.yaml'}) do
        local file = io.open(pandoc.path.join({candidate, name}), 'rb')
        if file then file:close(); root = candidate; break end
      end
      if root then break end
      local parent = pandoc.path.directory(candidate)
      if parent == candidate then break end
      candidate = parent
    end
  end
  root = root or input_dir
  return root, input, input_dir
end
