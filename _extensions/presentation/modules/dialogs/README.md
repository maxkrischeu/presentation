# Bestätigungen innerhalb der Präsentation

`context.get("dialogs").confirm({title, message, label})` liefert ein Promise
mit `true` bei Bestätigung und `false` bei Abbruch. Titel, Nachricht und
Bestätigungsbeschriftung werden vom aufrufenden Modul übersetzt übergeben.
Abhängigkeit `dialogs` ausdrücklich in `requires` deklarieren.

Der Dialog verwendet `showModal()` und die oberste Darstellungsebene des
Dokuments, sodass er auch über einer Vollbildpräsentation sichtbar bleibt.
Keine native Browser-Bestätigung und kein Verlassen/erneutes Anfordern von
Vollbild nötig. Abbrechen erhält zunächst den Fokus. Nach Schließen wird
der Dialog vollständig entfernt und der vorherige Fokus wiederhergestellt.
Gleichzeitige weitere Anfragen werden abgebrochen, nicht übereinander geöffnet.

Der Sitzungsreset benutzt diesen Dialog. Der eigentliche Reset bleibt bei den
Modulen; die aktuelle Folie und der Vollbildzustand werden nicht verändert.
