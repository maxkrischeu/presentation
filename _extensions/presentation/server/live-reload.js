// Serialized into preview HTML only. Uses Reveal's public navigation API;
// there is no persistent presentation/session state and no effect on exports.
export function liveReload(revision) {
  if (new URLSearchParams(location.search).has("print-pdf")) return;
  const key = "presentation-preview-position:" + location.pathname + location.search;
  const initialHash = location.hash;
  let saved = null;
  try {
    const value = JSON.parse(sessionStorage.getItem(key));
    sessionStorage.removeItem(key);
    if (value?.version === 1 && value.hash === initialHash &&
        Number.isInteger(value.index) && value.index >= 0 &&
        Number.isInteger(value.fragment) && value.fragment >= -1 &&
        Number.isFinite(value.time) && Math.abs(Date.now() - value.time) < 60000)
      saved = value;
  } catch {}

  function restore() {
    if (!saved) return;
    const deck = window.Reveal, slides = deck.getSlides();
    const slide = slides.find(slide => slide.id === saved.id) ||
      slides[Math.min(saved.index, slides.length - 1)];
    if (!slide) return;
    const indices = deck.getIndices(slide);
    const maxFragment = Math.max(-1, ...Array.from(slide.querySelectorAll(".fragment"),
      fragment => Number(fragment.dataset.fragmentIndex)).filter(Number.isFinite));
    deck.slide(indices.h, indices.v, Math.min(saved.fragment, maxFragment));
    saved = null;
  }

  function reload() {
    const deck = window.Reveal, slide = deck?.getCurrentSlide?.();
    if (slide) {
      const indices = deck.getIndices();
      try {
        sessionStorage.setItem(key, JSON.stringify({
          version: 1, id: slide.id, index: deck.getSlides().indexOf(slide),
          fragment: Number.isInteger(indices.f) ? indices.f : -1,
          hash: location.hash, time: Date.now(),
        }));
      } catch {
        // A numeric hash also survives a renamed automatic heading ID when
        // this tab's temporary storage is unavailable.
        const fragment = Number.isInteger(indices.f) && indices.f >= 0 ? "/" + indices.f : "";
        history.replaceState(history.state, "", location.pathname + location.search +
          "#/" + indices.h + "/" + (indices.v || 0) + fragment);
      }
    }
    location.reload();
  }

  async function check() {
    try {
      const response = await fetch("/__presentation/revision?page=" + encodeURIComponent(location.pathname), { cache: "no-store" });
      if (response.ok && (await response.json()).revision !== revision) {
        reload();
        return;
      }
    } catch {}
    setTimeout(check, 1000);
  }
  document.addEventListener("DOMContentLoaded", () => {
    const deck = window.Reveal;
    if (deck?.isReady()) restore();
    else deck?.on("ready", restore);
    setTimeout(check, 1000);
  }, { once: true });
}
