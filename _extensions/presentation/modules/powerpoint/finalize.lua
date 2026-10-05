local base=POWERPOINT_EXTENSION or pandoc.path.directory(PANDOC_SCRIPT_FILE)
local normalize=dofile(base..'/paths.lua')
local finalize=assert(loadfile(base..'/package.lua'))()
local function read(path) local f=assert(io.open(path,'rb'));local s=f:read('a');f:close();return s end
local list=os.getenv('QUARTO_PROJECT_OUTPUT_FILES') or ''
if os.getenv('QUARTO_USE_FILE_FOR_PROJECT_OUTPUT_FILES')=='true' then list=read(list) end
for output in list:gmatch('[^\r\n]+') do
 if output:match('%.pptx$') then
  local full=normalize(pandoc.path.is_absolute(output) and output or pandoc.path.join({pandoc.system.get_working_directory(),output}))
  local marker='.quarto/presentation/powerpoint/'..pandoc.utils.sha1(full)..'.json'
  local f=io.open(marker,'rb')
  if f then
   local cfg=pandoc.json.decode(f:read('a'));f:close()
   local bytes=finalize(read(full),cfg)
   local tmp=full..'.presentation-tmp';local dest=assert(io.open(tmp,'wb'));assert(dest:write(bytes));assert(dest:close())
   local ok,err=os.rename(tmp,full)
   if not ok then
    local backup=full..'.presentation-backup';assert(not io.open(backup,'rb'),'Existing backup: '..backup)
    assert(os.rename(full,backup));local installed,reason=os.rename(tmp,full)
    if not installed then assert(os.rename(backup,full));error(reason) end
    assert(os.remove(backup))
   end
  end
 end
end
