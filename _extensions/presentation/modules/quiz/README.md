# Quiz

`quiz.js` enthält Frageinitialisierung, schrittweise Einblendung, Erstversuchswertung, Again/Reset und Ergebnisdarstellung. Intro, Ergebnis und Fragenstil haben separate CSS-Dateien.

`module.js` bietet dem gemeinsamen Sitzungsmodell `snapshot()` und `reset()`. Die Quizbibliothek wird als Reveal-Plugin registriert; ihre konfigurierbaren Vorgaben stehen in `module.json`.

`module.json` ist die Ressourcenregistrierung. Eigene Beschriftungen liegen in `locales.json`. Nach Quellenänderungen den gemeinsamen Build ausführen; generierte Dateien unter `runtime/` nicht von Hand bearbeiten.

`filter.lua` übersetzt die öffentliche QMD-Schreibweise (`type`, `answers`, `columns`, `layout`, `subtitle`, `show`) in die internen Klassen und Datenattribute. Explizite Optionen haben Vorrang vor den entsprechenden älteren Klassen; ohne neue Optionen bleibt die bisherige Schreibweise gültig.

`quiz.cards: true` im Projekt-/Dokument-YAML ergänzt die Farbkarten Grün,
Gelb, Rot, Blau in der finalen Antwortreihenfolge. Standard: `false`.
`cards.css` reserviert rechts im Antwortfeld Platz für Karte und Auswahlzeichen.
Lückentexte und Fragen mit mehr als vier Antworten bleiben ohne Karten.
