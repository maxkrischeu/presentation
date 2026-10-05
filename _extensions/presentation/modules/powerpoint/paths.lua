-- Quarto may report nested/../named.pptx for --output. Use the same lexical
-- key before and after the file exists; Pandoc normalize preserves '..'.
return function(path)
  local value=path:gsub('\\','/')
  local prefix=value:match('^%a:') or (value:sub(1,2)=='//' and '/' or '')
  if prefix:match('^%a:') then value=value:sub(3) end
  local absolute=value:sub(1,1)=='/'
  local parts={}
  for part in value:gmatch('[^/]+') do
    if part=='..' and #parts>0 and parts[#parts]~='..' then table.remove(parts)
    elseif part~='.' and (part~='..' or not absolute) then parts[#parts+1]=part end
  end
  return prefix..(absolute and '/' or '')..table.concat(parts,'/')
end
