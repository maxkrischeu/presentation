-- Structural fragments with inherited project, slide and block options.
local function has(el,name) return el.classes and el.classes:includes(name) end
local function setting(el)
  local value=el.attributes and el.attributes.fragments
  -- Document previews are converted to standalone links by their own filter.
  if not value and (el.t=='Plain' or el.t=='Para') and #el.content==1 and el.content[1].t=='Link' then
    value=el.content[1].attributes.fragments
  end
  if value and value~='auto' and value~='off' and value~='together' then error('fragments must be auto, off or together.') end
  if value then return value end
  if has(el,'no-auto-fragments') then return 'off' end
  if has(el,'fragment-group') then return 'together' end
end
local function manual(el)
  return (has(el,'fragment') and not has(el,'rn-fragment')) or has(el,'incremental') or has(el,'nonincremental')
end
local function explicit(block)
  local found=manual(block)
  pandoc.walk_block(block,{Span=function(el) if manual(el) then found=true end end,Image=function(el) if manual(el) then found=true end end})
  return found
end
function Pandoc(doc)
  local config=doc.meta.presentation or {}
  local mode=config.fragments and pandoc.utils.stringify(config.fragments) or nil
  if mode and mode~='auto' and mode~='off' then error('presentation.fragments must be auto or off.') end
  if not mode then
    local old=config['auto-fragments']
    if old~=nil and type(old)~='boolean' then error('presentation.auto-fragments must be true or false.') end
    mode=old==false and 'off' or 'auto'
  end
  local effect=pandoc.utils.stringify(config['fragment-effect'] or 'fade')
  if effect~='fade' and effect~='fade-up' then error('presentation.fragment-effect must be fade or fade-up.') end
  local function animate(block)
    local classes={'fragment','presentation-auto-fragment'}
    if effect~='fade' then classes[#classes+1]=effect end
    return pandoc.Div({block},pandoc.Attr('',classes))
  end
  local process
  process=function(blocks,inherited)
    local result=pandoc.Blocks({})
    for _,block in ipairs(blocks) do
      local own=setting(block)
      local current=own or inherited
      if manual(block) or has(block,'notes') then
        result:insert(block)
      elseif current=='together' then
        -- One automatic step for the whole group; explicit fragments survive.
        result:insert(animate(block))
      elseif block.t=='BulletList' or block.t=='OrderedList' then
        for i,item in ipairs(block.content) do block.content[i]=process(item,current) end
        result:insert(block)
      elseif block.t=='Div' then
        local atomic=has(block,'presentation-embed') or has(block,'placed-image') or has(block,'image') or has(block,'video')
        if atomic then result:insert(current=='auto' and animate(block) or block)
        else
          block.content=process(block.content,current)
          local box=has(block,'statement') or has(block,'result') or has(block,'task') or has(block,'callout')
          result:insert(current=='auto' and box and animate(block) or block)
        end
      elseif current=='auto' and not explicit(block) and (block.t=='Para' or block.t=='Plain' or block.t=='CodeBlock' or block.t=='Table' or block.t=='Figure' or block.t=='BlockQuote' or block.t=='DefinitionList' or block.t=='LineBlock') then
        result:insert(animate(block))
      else result:insert(block) end
    end
    return result
  end
  local output,pending=pandoc.Blocks({}),pandoc.Blocks({})
  local skip,slideMode=true,mode
  local function flush()
    local content
    if skip then content=pending
    elseif slideMode=='together' then
      content=#pending>0 and pandoc.Blocks({animate(pandoc.Div(pending))}) or pending
    else content=process(pending,slideMode) end
    for _,block in ipairs(content) do output:insert(block) end
    pending=pandoc.Blocks({})
  end
  for _,block in ipairs(doc.blocks) do
    if block.t=='Header' and block.level<=2 then
      flush()
      slideMode=setting(block) or mode
      skip=block.level==1 or has(block,'quiz-question') or has(block,'quiz-intro') or has(block,'quiz-results')
      output:insert(block)
    elseif block.t=='HorizontalRule' then
      flush();skip=false;slideMode=mode;output:insert(block)
    else pending:insert(block) end
  end
  flush();doc.blocks=output;return doc
end
