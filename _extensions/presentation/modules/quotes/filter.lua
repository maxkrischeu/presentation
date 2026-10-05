local opening, closing = '“', '”'
local function metadata(meta)
  local language = pandoc.utils.stringify((meta.presentation or {}).lang or meta.lang or 'en'):lower()
  if language:match('^de') then opening, closing = '„', '“' end
end
local function quote(el)
  if not el.classes:includes('quote') then return end
  local first, last
  for _, block in ipairs(el.content) do
    if block.t == 'Para' or block.t == 'Plain' then
      first = first or block
      last = block
    end
  end
  if not first then error('quote: provide the quotation as one or more paragraphs.') end
  first.content:insert(1, pandoc.Str(opening))
  last.content:insert(pandoc.Str(closing))
  local author = (el.attributes.author or ''):match('^%s*(.-)%s*$')
  if author ~= '' then
    el.content:insert(pandoc.Para({pandoc.Span({pandoc.Str('— ' .. author)}, pandoc.Attr('', {'quote-author'}))}))
  end
  el.attributes.author = nil
  el.content = pandoc.Blocks({pandoc.BlockQuote(el.content)})
  return el
end
return {{Meta=metadata}, {Div=quote}}
