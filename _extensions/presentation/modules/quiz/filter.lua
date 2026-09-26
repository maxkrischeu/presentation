-- Public authoring attributes; runtime classes/data stay private to the quiz.
local function option(el, name, allowed)
  local value = el.attributes[name]
  if value == nil then return nil end
  if not allowed[value] then error('quiz: invalid '..name..'="'..value..'"') end
  el.attributes[name] = nil
  return value
end
local function remove(el, names)
  local classes = pandoc.List()
  for _, name in ipairs(el.classes) do
    if not names[name] then classes:insert(name) end
  end
  el.classes = classes
end
function Header(el)
  if el.classes:includes('quiz-question') then
    local kind = option(el, 'type', {single=true, multiple=true, cloze=true})
    if kind then
      remove(el, {['quiz-multiple']=true, ['quiz-cloze']=true})
      if kind ~= 'single' then el.classes:insert('quiz-'..kind) end
    end
    local answers = option(el, 'answers', {text=true, images=true})
    if answers then
      remove(el, {['quiz-images']=true})
      if answers == 'images' then el.classes:insert('quiz-images') end
    end
    local layout = option(el, 'layout', {standard=true, image=true})
    if layout then
      remove(el, {['quiz-image']=true})
      if layout == 'image' then el.classes:insert('quiz-image') end
    end
    local columns = option(el, 'columns', {['1']=true, ['2']=true})
    if columns then
      remove(el, {['quiz-columns']=true})
      el.attributes['data-quiz-columns'] = columns
      if columns == '2' then el.classes:insert('quiz-columns') end
    end
  elseif el.classes:includes('quiz-intro') then
    if el.attributes.subtitle ~= nil then
      el.attributes['data-quiz-subtitle'] = el.attributes.subtitle
      el.attributes.subtitle = nil
    end
  elseif el.classes:includes('quiz-results') then
    local show = option(el, 'show', {total=true, questions=true, both=true})
    if show then
      el.attributes['data-quiz-total'] = tostring(show ~= 'questions')
      el.attributes['data-quiz-questions'] = tostring(show ~= 'total')
    end
  end
  return el
end
