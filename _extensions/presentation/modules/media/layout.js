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
        if(height==='fill') {
          const top=(box.getBoundingClientRect().top-slide.getBoundingClientRect().top)/scale;
          box.style.height=Math.max(0,slide.clientHeight-parseFloat(getComputedStyle(slide).paddingBottom)-top-4)+'px';
        } else if(height?.endsWith('%')) {
          box.style.height=slide.clientHeight*parseFloat(height)/100+'px';
        } else if(height) box.style.height=height;
      }
    }
    deck.getSlidesElement().querySelectorAll('.presentation-media-box').forEach(box=>apply(box));
    deck.on('slidechanged',layout);deck.on('resize',layout);deck.on('ready',layout);
    requestAnimationFrame(layout);
    return {apply,layout};
  }
});
