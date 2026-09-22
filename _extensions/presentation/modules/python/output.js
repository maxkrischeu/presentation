/* Notebook-style file output, separate from the upstream editor and plot backend. */
(() => {
  let runtime, timer, host, empty;
  const entries = new Map();
  const imageTypes = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
  };
  const textTypes = new Set(["txt", "md", "py", "json", "log", "csv"]);
  function mount() {
    const plot = document.getElementById("drop-plot");
    if (!plot || host) return;
    const pane = plot.parentElement;
    pane.classList.add("presentation-output-pane");
    const title = document.createElement("div");
    title.className = "presentation-output-heading";
    title.textContent = Presentation.t("Output");
    empty = document.createElement("p");
    empty.className = "presentation-output-empty";
    empty.textContent = Presentation.t(
      "Plots appear here. Save files in /output to preview or download them.",
    );
    host = document.createElement("div");
    host.className = "presentation-output-files";
    pane.prepend(title, empty);
    pane.append(host);
    const updateEmpty = () => {
      empty.hidden = !!(plot.children.length || entries.size);
    };
    new MutationObserver(() => {
      updateEmpty();
      document.dispatchEvent(new Event("presentation-rich-output"));
    }).observe(plot, { childList: true, subtree: true });
    updateEmpty();
  }
  // Quoted separators, escaped quotes and multiline fields; previews are bounded.
  function csvRows(text) {
    const rows = [];
    let row = [],
      field = "",
      quoted = false;
    for (let i = 0; i < text.length && rows.length < 101; i++) {
      const c = text[i];
      if (c === '"') {
        if (quoted && text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = !quoted;
      } else if (c === "," && !quoted) {
        row.push(field);
        field = "";
      } else if ((c === "\n" || c === "\r") && !quoted) {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else field += c;
    }
    if (field || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }
  function card(name, bytes) {
    const ext = name.split(".").pop().toLowerCase();
    const url = URL.createObjectURL(
      new Blob([bytes], {
        type:
          imageTypes[ext] ||
          (textTypes.has(ext)
            ? "text/plain;charset=utf-8"
            : "application/octet-stream"),
      }),
    );
    const node = document.createElement("article");
    node.className = "presentation-output-file";
    node.dataset.outputFile = name;
    const header = document.createElement("header"),
      label = document.createElement("strong"),
      link = document.createElement("a");
    label.textContent = name;
    link.textContent = Presentation.t("Download");
    link.href = url;
    link.download = name.split("/").pop();
    header.append(label, link);
    node.append(header);
    if (imageTypes[ext]) {
      const img = document.createElement("img");
      img.src = url;
      img.alt = name;
      node.append(img);
    } else if (textTypes.has(ext)) {
      const text = new TextDecoder().decode(bytes.slice(0, 100000));
      if (ext === "csv") {
        const table = document.createElement("table");
        csvRows(text)
          .slice(0, 100)
          .forEach((row, i) => {
            const tr = document.createElement("tr");
            row.slice(0, 20).forEach((value) => {
              const cell = document.createElement(i ? "td" : "th");
              cell.textContent = value;
              tr.append(cell);
            });
            table.append(tr);
          });
        const scroll = document.createElement("div");
        scroll.className = "presentation-output-table";
        scroll.append(table);
        node.append(scroll);
        const note = document.createElement("small");
        note.textContent = Presentation.t(
          "Preview: up to 100 rows / 20 columns. Download contains the full file.",
        );
        node.append(note);
      } else {
        const pre = document.createElement("pre");
        pre.textContent = text;
        node.append(pre);
      }
      if (bytes.length > 100000) {
        const note = document.createElement("small");
        note.textContent = Presentation.t(
          "Preview truncated. Download contains the full file.",
        );
        node.append(note);
      }
    }
    return { node, url, bytes };
  }
  function scan() {
    if (!runtime) return;
    mount();
    if (!host) return;
    const fs = runtime.FS,
      seen = new Set();
    let count = 0,
      total = 0;
    function walk(dir, depth = 0) {
      if (depth > 4) return;
      for (const name of fs.readdir(dir).sort()) {
        if (name === "." || name === "..") continue;
        const path = dir + "/" + name,
          stat = fs.lstat(path);
        if (fs.isLink(stat.mode)) continue;
        if (fs.isDir(stat.mode)) {
          walk(path, depth + 1);
          continue;
        }
        if (
          !fs.isFile(stat.mode) ||
          ++count > 100 ||
          stat.size > 10 * 1024 * 1024 ||
          total + stat.size > 20 * 1024 * 1024
        )
          continue;
        total += stat.size;
        const key = path.slice("/output/".length);
        seen.add(key);
        const bytes = fs.readFile(path),
          old = entries.get(key);
        if (
          old &&
          old.bytes.length === bytes.length &&
          bytes.every((v, i) => v === old.bytes[i])
        )
          continue;
        document.dispatchEvent(new Event("presentation-rich-output"));
        const next = card(key, bytes);
        entries.set(key, next);
        if (old) {
          old.node.replaceWith(next.node);
          URL.revokeObjectURL(old.url);
        } else host.append(next.node);
      }
    }
    try {
      walk("/output");
    } catch (error) {
      console.warn("Presentation output scan:", error);
    }
    for (const [key, entry] of entries)
      if (!seen.has(key)) {
        entry.node.remove();
        URL.revokeObjectURL(entry.url);
        entries.delete(key);
      }
    empty.hidden = !!(
      document.getElementById("drop-plot")?.children.length || entries.size
    );
  }
  window.PresentationDropOutput = {
    init(pyodide) {
      runtime = pyodide;
      runtime.FS.mkdirTree("/output");
      this.refresh();
    },
    refresh() {
      clearTimeout(timer);
      timer = setTimeout(scan, 60);
    },
  };
})();
