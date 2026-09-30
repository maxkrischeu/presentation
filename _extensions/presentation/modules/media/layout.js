Presentation.register({
  id:'media', requires:['frame'],
  setup({deck}) {
    function apply(box, attributes=box.dataset) {
      box.classList.add('presentation-media-box');
      box.dataset.mediaAlign=attributes.mediaAlign || 'center';
      for(const key of ['Width','Height']) if(attributes['media'+key]) box.dataset['media'+key]=attributes['media'+key];
      if(box.dataset.mediaWidth) box.style.width=box.dataset.mediaWidth;
    }
    function layout() {
      const slide=deck.getCurrentSlide();
      if(!slide) return;
      const scale=deck.getScale()||1;
      for(const box of slide.querySelectorAll('.presentation-media-box')) {
        const height=box.dataset.mediaHeight;
        const video=box.classList.contains('presentation-inline-media')
          ? box.querySelector(':scope > video') : null;
        // Start from the requested width on every pass, so a previous fit does
        // not prevent the player from growing after a resize or metadata load.
        if(video && height==='fill') box.style.width=box.dataset.mediaWidth || '';
        if(height==='fill') {
          const top=(box.getBoundingClientRect().top-slide.getBoundingClientRect().top)/scale;
          box.style.height=Math.max(0,slide.clientHeight-parseFloat(getComputedStyle(slide).paddingBottom)-top-4)+'px';
        } else if(height?.endsWith('%')) {
          box.style.height=slide.clientHeight*parseFloat(height)/100+'px';
        } else if(height) box.style.height=height;
        if(video && height==='fill' && video.videoWidth>0 && video.videoHeight>0) {
          const ratio=video.videoWidth/video.videoHeight;
          const width=Math.min(box.clientWidth,box.clientHeight*ratio);
          // Fit the actual player, including its native controls, not only
          // the picture rendered inside an oversized video element.
          box.style.width=width+'px';
          box.style.height=width/ratio+'px';
        }
      }
    }
    deck.getSlidesElement().querySelectorAll('.presentation-media-box').forEach(box=>apply(box));
    deck.on('slidechanged',layout);deck.on('resize',layout);deck.on('ready',layout);
    deck.on('fragmentshown',layout);deck.on('fragmenthidden',layout);
    deck.getSlidesElement().addEventListener('loadedmetadata',layout,true);
    requestAnimationFrame(layout);
    return {apply,layout};
  }
});
