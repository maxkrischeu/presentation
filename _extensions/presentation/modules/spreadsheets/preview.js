Presentation.register({
  id:'spreadsheets', requires:['frame','media'],
  setup({deck,t,get,changed,print}) {
    let overlay=null, previousFocus=null;
    const previews=[];
    function close() {
      if (!overlay) return;
      overlay.remove();overlay=null;previousFocus?.focus();changed();
    }
    function createPreview({url,title,sheet,range,lazy=false,compact=false}) {
      const source=new URL(url,document.baseURI);
      if(!['http:','https:','file:','blob:'].includes(source.protocol)) throw Error('Unsupported spreadsheet URL');
      const box=document.createElement('div');box.className='presentation-spreadsheet-preview';box.dataset.preventSwipe='true';
      const frame=document.createElement('iframe');frame.title=title||t('Spreadsheet');
      const target=new URL(window.PresentationSpreadsheetViewerURL);
      for(const [key,value] of Object.entries({file:source.href,lang:Presentation.language||'en',sheet,range})) if(value) target.searchParams.set(key,value);
      if(lazy&&!print) frame.dataset.src=target.href;else frame.src=target.href;
      const actions=document.createElement('div');actions.className='presentation-spreadsheet-actions';
      const label=document.createElement('strong');label.textContent=title||decodeURIComponent(source.pathname.split('/').pop());
      const expand=document.createElement('button');expand.type='button';expand.textContent=t('Enlarge spreadsheet');
      expand.onclick=()=>{
        close();previousFocus=expand;
        overlay=document.createElement('div');overlay.className='presentation-spreadsheet-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',label.textContent);
        const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent=t('Close spreadsheet');dismiss.onclick=close;
        const large=createPreview({url:source.href,title:label.textContent,sheet:frame.dataset.sheet||sheet,range:frame.dataset.range||range,compact:true});
        overlay.append(dismiss,large);(document.fullscreenElement||document.body).append(overlay);
        overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}e.stopPropagation();});
        dismiss.focus();changed();
      };
      const download=document.createElement('a');download.href=source.href;download.download='';download.textContent=t('Download');
      actions.append(label);if(!compact&&!print) actions.append(expand);actions.append(download);
      box.append(frame,actions);
      // Requests never escape to the deck, including navigation keys in the toolbar.
      for(const event of ['click','dblclick','pointerdown','keydown']) box.addEventListener(event,e=>e.stopPropagation());
      return box;
    }
    deck.getRevealElement().querySelectorAll('a.spreadsheet-preview').forEach(link=>{
      const box=createPreview({url:link.href,title:link.textContent,sheet:link.dataset.sheet,range:link.dataset.range,lazy:true});
      get('media').apply(box,{...link.dataset,mediaHeight:link.dataset.mediaHeight||'fill'});
      if(link.parentElement.tagName==='P'&&link.parentElement.childNodes.length===1) link.parentElement.replaceWith(box);else link.replaceWith(box);
      if(print)box.style.height=link.dataset.mediaHeight?.endsWith('px')?link.dataset.mediaHeight:'420px';
      previews.push(box);
    });
    addEventListener('message',event=>{if(event.origin!==location.origin||event.data?.type!=='presentation-spreadsheet-state')return;for(const frame of document.querySelectorAll('.presentation-spreadsheet-preview iframe'))if(frame.contentWindow===event.source){frame.dataset.sheet=String(event.data.sheet||'');frame.dataset.range=String(event.data.range||'');}});
    function layout(){for(const box of previews) if(deck.getCurrentSlide()?.contains(box)){const frame=box.querySelector('iframe[data-src]');if(frame){frame.src=frame.dataset.src;delete frame.dataset.src;}}get('media').layout();}
    deck.on('slidechanged',()=>{close();layout();});deck.on('ready',layout);requestAnimationFrame(layout);
    async function preparePrint() {
      await Promise.all([...document.querySelectorAll('.presentation-spreadsheet-preview iframe')].map(frame=>new Promise((resolve,reject)=>{
        const start=Date.now();const timer=setInterval(()=>{
          if(frame.contentDocument?.querySelector('#viewport[data-ready=true],#viewport[data-error=true]')){clearInterval(timer);resolve();}
          else if(Date.now()-start>35000){clearInterval(timer);reject(Error('Spreadsheet preview did not finish loading.'));}
        },100);
      })));
    }
    return {createPreview,preparePrint,panels:[{id:'spreadsheet',priority:100,isOpen:()=>!!overlay,close}],reset:close};
  }
});
