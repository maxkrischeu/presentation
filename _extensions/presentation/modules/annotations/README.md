# Rough Notation

`rough.lua` ergänzt Fragmentklassen und die HTML-Abhängigkeiten. `rough.js` verbindet Annotationen mit stabiler Folien-/Fragmentgeometrie. Die Zeichenbibliothek liegt in `assets/`.

Dieses Modul braucht keine eigene Modus-/Sitzungsregistrierung. Sein Manifest bindet den Filter ein; der Filter lädt die lokalen Ressourcen.

`module.json` ist die Ressourcenregistrierung. Eigene Beschriftungen liegen in `locales.json`. Nach Quellenänderungen den gemeinsamen Build ausführen; generierte Dateien unter `runtime/` nicht von Hand bearbeiten.
