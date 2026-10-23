# Quiz

`quiz.js` enthält Frageinitialisierung, schrittweise Einblendung, Erstversuchswertung, Again/Reset und Ergebnisdarstellung. Intro, Ergebnis und Fragenstil haben separate CSS-Dateien.

`module.js` bietet dem gemeinsamen Sitzungsmodell `snapshot()` und `reset()`. Die Quizbibliothek wird als Reveal-Plugin registriert; ihre konfigurierbaren Vorgaben stehen in `module.json`.

`module.json` ist die Ressourcenregistrierung. Eigene Beschriftungen liegen in `locales.json`. Nach Quellenänderungen den gemeinsamen Build ausführen; generierte Dateien unter `runtime/` nicht von Hand bearbeiten.

`filter.lua` übersetzt die öffentliche QMD-Schreibweise (`type`, `answers`, `columns`, `layout`, `subtitle`, `show`) in die internen Klassen und Datenattribute. Explizite Optionen haben Vorrang vor den entsprechenden älteren Klassen; ohne neue Optionen bleibt die bisherige Schreibweise gültig.

`quiz.cards: true` im Projekt-/Dokument-YAML ergänzt die Farbkarten Grün,
Gelb, Rot, Blau in der finalen Antwortreihenfolge. Standard: `false`.
`cards.css` reserviert rechts im Antwortfeld Platz für Karte und Auswahlzeichen.
Lückentexte und Fragen mit mehr als vier Antworten bleiben ohne Karten.

Auswahlfragen blenden Inhaltsblöcke in ihrer QMD-Reihenfolge ein, einschließlich
freier Bildanker und Inline-Bilder. Das gilt mit und ohne `layout="image"`.
Antwortlisten erhalten einen Schritt pro Antwort; Container ohne Antwortlisten
bleiben gemeinsame Schritte. Die Bedienelemente erscheinen mit der letzten Antwort.
Textantworten erhalten getrennte Nummern- und Textspalten für bündige Folgezeilen.

`quiz.timer: false|Sekunden` aktiviert optional einen Countdown (1–3600 ganze
Sekunden). Das Frageattribut `timer="15"` überschreibt die Vorgabe,
`timer="off"` schaltet sie aus. `timer.js` besitzt Deadline, Pause und Anzeige;
die bestehenden Fragecontroller übernehmen die eigentliche Bewertung.
Der Countdown startet erst mit sichtbaren Bedienelementen nach der letzten
Antwort. Folienwechsel, Zurückblenden, Übersicht, Schwarzbild, Druck und
ausgeblendeter Browser-Reiter pausieren ihn; ein eigener Klick pausiert manuell.
Bei Ablauf werden auch unvollständige/fehlende Antworten geprüft, Lösungen
angezeigt und die Auswahl bis Again gesperrt. Frühes Check stoppt ebenfalls.
Again setzt nur den Versuch und Timer zurück, Reset zusätzlich die Erstwertung.
Restzeit, Pause, Abschluss und Timeout-Lösungen gehören zum Frage-Snapshot.
Print erzeugt keine laufende Anzeige. Inerte Dokumentressourcen bleiben beim
Entfernen einer letzten Live-Ergebnisfolie für den PDF-Export erhalten.

Prüfung: `tests/quiz-timer-check.cjs`; interaktiver Rundgang:
`tests/quiz-timer.qmd`. Reine Uhrlogik: `modules/quiz/tests/timer-check.cjs`.
