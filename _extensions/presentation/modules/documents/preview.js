/* PDF.js preview with native-browser links, independent of slide markup. */
Presentation.register({
  id: "documents",
  requires: ["frame"],
  setup({ deck, t, print }) {
    const previews = [];
    function createPreview({ url, title, height, lazy = false }) {
      const source = new URL(url, document.baseURI);
      if (!["http:", "https:", "file:", "blob:"].includes(source.protocol))
        throw new Error("Unsupported document URL");
      let filename = source.pathname.split("/").pop() || "PDF";
      try { filename = decodeURIComponent(filename); } catch { /* Keep malformed URL escapes readable. */ }
      title = title?.trim() || filename;
      const container = document.createElement("div");
      container.className = "presentation-document-preview";
      if (height && /^\d+(\.\d+)?(px|vh|rem|em)$/.test(height))
        container.style.setProperty("--document-height", height);
      const actions = document.createElement("div");
      actions.className = "presentation-document-actions";
      const label = document.createElement("strong");
      label.textContent = title;
      const open = document.createElement("a");
      open.href = source.href;
      open.target = "_blank";
      open.rel = "noopener";
      open.textContent = t("Open separately");
      const download = document.createElement("a");
      download.href = source.href;
      download.download = "";
      download.textContent = t("Download");
      actions.append(label, open, download);
      container.append(actions);
      if (!print) {
        const viewer = document.createElement("iframe");
        viewer.title = title;
        const viewerURL = new URL(window.PresentationDocumentViewerURL);
        viewerURL.searchParams.set("file", source.href);
        viewerURL.searchParams.set("title", title);
        viewerURL.searchParams.set("lang", Presentation.language || "en");
        viewerURL.searchParams.set("loading", t("Loading PDF …"));
        viewerURL.searchParams.set("page", t("Page"));
        viewerURL.searchParams.set("error", t("Could not load PDF. Please use “Open separately”."));
        if (lazy) viewer.dataset.src = viewerURL.href;
        else viewer.src = viewerURL.href;
        viewer.className = "presentation-document-viewer";
        container.prepend(viewer);
      }
      return container;
    }
    deck.getRevealElement().querySelectorAll("a.pdf-preview").forEach((link) => {
      const preview = createPreview({
        url: link.href, title: link.textContent, lazy: true,
        height: link.getAttribute("height") || link.dataset.height,
      });
      const paragraph = link.parentElement;
      if (paragraph.tagName === "P" && paragraph.childNodes.length === 1)
        paragraph.replaceWith(preview);
      else link.replaceWith(preview);
      previews.push(preview);
    });
    function layout() {
      const slide = deck.getCurrentSlide();
      for (const preview of previews) {
        if (!slide?.contains(preview)) continue;
        if (!preview.style.getPropertyValue("--document-height")) {
          const scale = deck.getScale() || 1;
          const top = (preview.getBoundingClientRect().top - slide.getBoundingClientRect().top) / scale;
          const bottom = parseFloat(getComputedStyle(slide).paddingBottom) || 0;
          preview.style.setProperty("--document-auto-height", `${Math.max(120, slide.clientHeight - top - bottom - 4)}px`);
        }
        const viewer = preview.querySelector("iframe[data-src]");
        if (viewer) {
          viewer.src = viewer.dataset.src;
          delete viewer.dataset.src;
        }
      }
    }
    deck.on("slidechanged", layout);
    deck.on("resize", layout);
    requestAnimationFrame(layout);
    return { createPreview };
  },
});
