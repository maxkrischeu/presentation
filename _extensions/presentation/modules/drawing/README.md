# Zeichnungen und Tafel

`engine.js` ist der angepasste Chalkboard-Renderer mit Strichidentitäten und Objektradierer. `drawing.js` kapselt den Zugriff auf Canvas-Zustand und Folienvorschauen. `toolbar.js` besitzt ausschließlich die Zeichenwerkzeuge.

Das Modul registriert die Modi `draw` und `board`, Farb-/Radierer-Panels, Werkzeugleiste, `snapshot()` und `reset()`. Export-Aufrufe gehen über registrierte Befehle.

`module.json` ist die Ressourcenregistrierung. Eigene Beschriftungen liegen in `locales.json`. Nach Quellenänderungen den gemeinsamen Build ausführen; generierte Dateien unter `runtime/` nicht von Hand bearbeiten.
