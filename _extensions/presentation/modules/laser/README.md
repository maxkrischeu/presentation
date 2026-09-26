# Laserpointer

`laser.js` besitzt Canvas, Eingabe und gemeinsamen Verblass-Timer. Neue Striche erneuern die Lebensdauer sämtlicher sichtbarer Striche.

Registriert einen Modus mit erlaubter Foliennavigation sowie eigene Leiste und Farbauswahl. Temporäre Laserspuren werden nicht gespeichert.

`module.json` ist die Ressourcenregistrierung. Eigene Beschriftungen liegen in `locales.json`. Nach Quellenänderungen den gemeinsamen Build ausführen; generierte Dateien unter `runtime/` nicht von Hand bearbeiten.

### Verblassen des Laserpointers

```yaml
presentation:
  laser:
    fade-delay: 3
```

`fade-delay` gibt die Wartezeit nach dem Loslassen in Sekunden an (Standard: `1`).
Danach verblassen die Striche weich über 1,5 Sekunden. `0` startet das Verblassen
sofort; Dezimalwerte wie `0.5` sind möglich. Neue Striche starten die gemeinsame
Wartezeit für alle sichtbaren Striche erneut. Die Einstellung gilt für Laserspuren,
nicht für den Punkt unter dem Mauszeiger.
