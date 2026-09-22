# Python-Konsole

`drop-runtime.js` ist das übernommene kompilierte Quarto-Drop-Bundle. `adapter.js` kapselt Start, Layout und Werkzeugleiste. `output.js` behandelt Dateien und Rich Output im Browser.

`module.js` registriert den Python-Modus. Die WebAssembly-Laufzeit startet erst beim ersten Öffnen. Kernelzustände werden nicht in Sitzungs-Exporte aufgenommen.

`module.json` ist die Ressourcenregistrierung. Eigene Beschriftungen liegen in `locales.json`. Nach Quellenänderungen den gemeinsamen Build ausführen; generierte Dateien unter `runtime/` nicht von Hand bearbeiten.
