// Presentation UI only; authored slide content and asset labels are never translated.
window.Presentation = window.Presentation || {};
(() => {
  const language = (document.documentElement.lang || "de")
    .toLowerCase()
    .split("-")[0];
  const de = Presentation.messages.de || {};

  Presentation.language = language === "de" ? "de" : "en";
  Presentation.t = (key, values = {}) => {
    const text = Presentation.language === "de" ? (de[key] ?? key) : key;
    return text.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
  };
  // Explicitly applied to owned UI fragments, never to the slide tree.
  Presentation.localize = (root) => {
    const elements = [root, ...root.querySelectorAll("*")];
    for (const element of elements) {
      for (const name of ["title", "aria-label", "placeholder"]) {
        if (element.hasAttribute?.(name))
          element.setAttribute(
            name,
            Presentation.t(element.getAttribute(name)),
          );
      }
      for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
          node.textContent = node.textContent.replace(
            /^(\s*)([\s\S]*?)(\s*)$/,
            (_, before, text, after) => before + Presentation.t(text) + after,
          );
        }
      }
    }
  };
})();
