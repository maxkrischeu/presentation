Presentation.register({
  id: 'embed', requires: ['frame','media'],
  setup({deck,t,print,get}) {
    const embeds = [...deck.getSlidesElement().querySelectorAll('.presentation-embed')];
    for (const box of embeds) {
      const link = box.querySelector('a');
      const url = new URL(link.href);
      if (!['file:','http:','https:'].includes(url.protocol)) continue;
      const title = box.dataset.embedTitle;
      get('media').apply(box);
      if(!box.dataset.mediaWidth) box.style.width='100%';
      const bar = document.createElement('div');
      bar.className = 'presentation-embed-bar';
      const label = document.createElement('span');label.textContent = title;
      link.textContent = t('Open separately');link.target = '_blank';link.rel = 'noopener noreferrer';
      bar.append(label,link);box.replaceChildren(bar);
      if (!print) {
        const frame = document.createElement('iframe');
        frame.title = title;
        frame.dataset.source = url.href;
        // Scripts may run inside the resource, without access to the deck.
        frame.setAttribute('sandbox','allow-scripts allow-forms allow-popups');
        frame.referrerPolicy = 'no-referrer';
        box.prepend(frame);
      }
    }
    function layout() {
      const slide = deck.getCurrentSlide();
      for (const box of embeds) {
        if (!slide?.contains(box)) continue;
        if (!box.dataset.mediaHeight && !print) {
          const top = (box.getBoundingClientRect().top-slide.getBoundingClientRect().top)/(deck.getScale()||1);
          box.style.height = `${Math.max(120,slide.clientHeight-top-parseFloat(getComputedStyle(slide).paddingBottom)-4)}px`;
        }
        const frame = box.querySelector('iframe[data-source]');
        if(frame){frame.src=frame.dataset.source;delete frame.dataset.source;}
      }
    }
    deck.on('slidechanged',layout);deck.on('resize',layout);requestAnimationFrame(layout);
    return {};
  }
});
