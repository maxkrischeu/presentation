# PDF und Präsentations-ZIP

`dialog.js` besitzt die Exportauswahl. `service.py` validiert Aufträge und baut ZIPs; `worker.cjs` erzeugt Sitzungs-PDFs. `render.cjs` erzeugt PDFs des gerenderten Grundstands auf ausdrücklichen CLI-Aufruf. `pdf-layout.cjs` definiert das gemeinsame Seitenformat.

Registriert Exportbefehle und den HTTP-Dienst `export`. Verwendet `core/session.js` und öffentliche Snapshots, nicht die Editor-DOMs. Unit-Tests für Quarto-Eingaben liegen in `tests/`.

`module.json` ist die Ressourcenregistrierung. Eigene Beschriftungen liegen in `locales.json`. Nach Quellenänderungen den gemeinsamen Build ausführen; generierte Dateien unter `runtime/` nicht von Hand bearbeiten.
