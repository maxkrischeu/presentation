# Lupe

`magnifier.js` verwaltet den DOM-Spiegel der aktuellen Folie, Vergrößerung und Maus-/Touchposition. Es erzeugt keinen langsamen Screenshot beim Eintritt.

Registriert einen Modus mit Foliennavigation und eigener Leiste. Ruft keine privaten Implementierungen anderer Module auf.

`module.json` ist die Ressourcenregistrierung. Eigene Beschriftungen liegen in `locales.json`. Nach Quellenänderungen den gemeinsamen Build ausführen; generierte Dateien unter `runtime/` nicht von Hand bearbeiten.
