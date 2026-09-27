/* Decode a preview separately so the player's time, sound and playback stay intact. */
Presentation.register({
  id: "video-posters",
  requires: ["media"],
  interactiveOnly: true,
  setup({ deck }) {
    const cache = new Map();
    const pending = new WeakSet();
    const source = video => video.currentSrc || video.getAttribute("src") ||
      video.getAttribute("data-src") || video.querySelector("source")?.getAttribute("src") ||
      video.querySelector("source")?.getAttribute("data-src");
    function poster(src) {
      if (cache.has(src)) return cache.get(src);
      const promise = new Promise(resolve => {
        const decoder = document.createElement("video");
        decoder.muted = true;
        decoder.playsInline = true;
        decoder.preload = "auto";
        if (/^https?:/.test(src) && new URL(src, location.href).origin !== location.origin)
          decoder.crossOrigin = "anonymous";
        let finished = false;
        const timer = setTimeout(() => finish(null), 15000);
        function finish(value) {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          decoder.onloadedmetadata = decoder.onloadeddata = decoder.onseeked = decoder.onerror = null;
          decoder.removeAttribute("src");
          decoder.load();
          resolve(value);
        }
        function capture() {
          if (decoder.readyState < 2 || !decoder.videoWidth || decoder.seeking) return;
          try {
            const canvas = document.createElement("canvas");
            canvas.width = Math.min(1280, decoder.videoWidth);
            canvas.height = Math.max(1, Math.round(canvas.width * decoder.videoHeight / decoder.videoWidth));
            canvas.getContext("2d").drawImage(decoder, 0, 0, canvas.width, canvas.height);
            finish(canvas.toDataURL("image/jpeg", .85));
          } catch (_) { finish(null); }
        }
        decoder.onloadedmetadata = () => {
          const time = Number.isFinite(decoder.duration) ? Math.min(.1, decoder.duration / 2) : 0;
          if (time > 0) decoder.currentTime = time;
          else capture();
        };
        decoder.onloadeddata = decoder.onseeked = capture;
        decoder.onerror = () => finish(null);
        decoder.src = src;
      });
      cache.set(src, promise);
      return promise;
    }
    function scan() {
      for (const video of deck.getCurrentSlide()?.querySelectorAll("video") || []) {
        const src = source(video);
        if (!src || video.hasAttribute("poster") || pending.has(video)) continue;
        const url = new URL(src, location.href).href;
        pending.add(video);
        poster(url).then(image => {
          if (image && !video.hasAttribute("poster") && source(video) && new URL(source(video), location.href).href === url)
            video.poster = image;
        }).finally(() => pending.delete(video));
      }
    }
    deck.on("ready", scan);
    deck.on("slidechanged", scan);
    deck.on("fragmentshown", scan);
    // Native Reveal media can receive their source lazily after slidechanged.
    const observer = new MutationObserver(scan);
    observer.observe(deck.getSlidesElement(), {subtree:true, childList:true, attributes:true, attributeFilter:["src", "data-src"]});
    scan();
    return {};
  },
});
