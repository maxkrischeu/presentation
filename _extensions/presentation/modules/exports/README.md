# PDF und Präsentations-ZIP

`dialog.js` besitzt die Exportauswahl. `service.ts` validiert Aufträge und baut ZIPs;
`worker.ts` erzeugt Sitzungs-PDFs. `render.ts` exportiert vorhandene HTML-Dateien auf
expliziten CLI-Aufruf. `pdf-layout.ts` definiert A4 quer mit 10 mm Rand.

`browser.ts` verwendet Quartos öffentliche Erkennung und Browserinstallation.
`cdp.ts` steuert eine kurzlebige Browserinstanz mit eigenem temporären Profil.
`prepare-page.js` ergänzt die eingefrorenen Sitzungszeichnungen im Druckdokument.
Die MIT-lizenzierte PDF-Bibliothek liegt unter `vendor/`; keine npm-Installation.

Registriert den Dienst `export`. Verwendet öffentliche Snapshots aus `core/session.js`.
Nach Quellenänderungen bauen; generierte `runtime/`-Dateien nicht von Hand ändern.
