# Uhr für Arbeitsphasen

```markdown
## Tippübungen {fragments="off"}

:::: {.vcenter}
::: {.timer minutes="10" direction="up" autostart="true"}
:::
::::
```

Der leere `.timer`-Div zeigt eine große digitale Uhr mit Zielzeit,
Fortschrittsleiste sowie Pause/Fortsetzen und Zurücksetzen. `minutes` ist eine
positive Zahl bis 180 (auch Dezimalzahlen sind möglich), Standard 10.
Die Dauer wird auf ganze Sekunden gerundet, mindestens eine Sekunde.
`direction="up"` zählt die geleistete Zeit, `direction="down"` die Restzeit.
Standard ist `up`. Bei der Zielzeit stoppt die Uhr ohne Ton.
Oberhalb der Zeit steht nur bei einer Unterbrechung „Pausiert“; im Startzustand,
während des Laufens und nach dem Ende erscheint kein zusätzlicher Hinweistext.

`autostart="true"` startet beim ersten Betreten der Folie. Ohne diese Angabe
beginnt sie erst über Starten. Nach Zurücksetzen wartet sie auf einen neuen
manuellen Start. Folienwechsel, Übersicht und Schwarzbild pausieren die Uhr;
bei Rückkehr läuft sie weiter, sofern die Lehrkraft sie nicht manuell pausiert
hat. Ein Wechsel zu einem anderen Browser-Tab lässt die Arbeitszeit weiterlaufen.

Der Timer besitzt einen eigenen Sitzungszustand (`timer`) für die bestehenden
Sitzungs-/Exportverträge. Eine normale Neuladung beginnt ohne gespeicherten
Sitzungsstand von vorn. Die Druckansicht läuft nicht und blendet die Knöpfe aus;
ein exportierter Sitzungsstand behält die erreichte Zeit. Kein zusätzlicher
Server oder externer Timerdienst erforderlich.

Für einen dauerhaft benannten Sitzungsstand kann der Div eine eigene ID bekommen,
zum Beispiel `.timer #tippuhr`. Das erhält seine Zuordnung auch beim Einfügen
weiterer Timer in die Präsentation.

Logikprüfung im Quellprojekt: `node --test _extensions/presentation/modules/timer/tests/clock.test.cjs`.
