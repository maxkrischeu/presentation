# Bildbibliothek und Bildbearbeitung

`filter.lua` liest Bildkataloge und platzierte Bilder aus Quarto. `editor.js` verbindet Zustand und Bedienung. `geometry.js` rechnet ohne DOM, `history.js` verwaltet objektbezogenes Undo/Redo. `source.py` schreibt konfliktgeprüfte Div-Blöcke ins QMD.

`module.js` registriert Bildbearbeitung, Bibliothek, Dock und Quellen-Speichern. `snapshot()` enthält vorbereitete/geänderte Positionen mit Quellenrevision. Unit-Tests liegen in `tests/`.

`module.json` ist die Ressourcenregistrierung. Eigene Beschriftungen liegen in `locales.json`. Nach Quellenänderungen den gemeinsamen Build ausführen; generierte Dateien unter `runtime/` nicht von Hand bearbeiten.

In der Bibliothek scrollen vertikale Fingerbewegungen nativ. Ein kurzer Klick
fügt das Medium mittig ein; bewusstes horizontales Herausziehen nach links
platziert es auf der Folie. Scroll-/Wheel-Ereignisse brechen einen noch nicht
begonnenen Einfügevorgang ab, auch bei von Sidecar übersetzten Gesten.
