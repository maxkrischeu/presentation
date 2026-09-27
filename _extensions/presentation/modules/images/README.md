# Bildbibliothek und Bildbearbeitung

`filter.lua` liest Bildkataloge und platzierte Bilder aus Quarto. `editor.js` verbindet Zustand und Bedienung. `geometry.js` rechnet ohne DOM, `history.js` verwaltet objektbezogenes Undo/Redo. `source.py` schreibt konfliktgeprüfte Div-Blöcke ins QMD.

`module.js` registriert Bildbearbeitung, Bibliothek, Dock und Quellen-Speichern. `snapshot()` enthält vorbereitete/geänderte Positionen mit Quellenrevision. Unit-Tests liegen in `tests/`.

`module.json` ist die Ressourcenregistrierung. Eigene Beschriftungen liegen in `locales.json`. Nach Quellenänderungen den gemeinsamen Build ausführen; generierte Dateien unter `runtime/` nicht von Hand bearbeiten.

In der Bibliothek scrollen vertikale Fingerbewegungen nativ. Ein kurzer Klick
fügt das Medium mittig ein; bewusstes horizontales Herausziehen nach links
platziert es auf der Folie. Scroll-/Wheel-Ereignisse brechen einen noch nicht
begonnenen Einfügevorgang ab, auch bei von Sidecar übersetzten Gesten.

Etwa 350 ms Halten markiert ein Medium als aufgenommen. Danach darf die
Ziehbewegung in jede Richtung starten, auch mit Touch. Loslassen ohne Ziehen
bricht ab. Sofortiges vertikales Wischen scrollt weiterhin; Scrollen, Abbruch,
Fokusverlust und ein zweiter Finger beenden einen ausstehenden Haltevorgang.

Maus-/Trackpad-Gesten verwenden natives HTML-Drag-and-drop. Touch behält die
Haltegeste. Die Bibliothek hat keine persistente Auswahl und keine graue Hover-Markierung.
Ein gemeinsamer Rahmen kennzeichnet genau ein Ziel für Maus, Tastatur oder
Halten. Scrollen hebt diesen Rahmen auf. Die Ziehvorschau enthält nur die Bildfläche, ohne Kachel oder Titel.
