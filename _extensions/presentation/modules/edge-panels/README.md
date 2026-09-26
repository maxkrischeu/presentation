# Seitenleisten per Ziehen und Wischen

Die schmalen Griffe am linken und rechten Rand öffnen Menü bzw. Medienbibliothek.
Sie unterstützen Maus, Stift und Finger über Pointer Events sowie horizontale
Scrollgesten (Trackpad bzw. über Sidecar weitergeleitete Wischgesten).

Zum Öffnen den Griff nach innen ziehen. Die Leiste folgt der Bewegung; ein
kurzer Zug zurück bricht ab. Zum Schließen den Griff am inneren Rand der offenen
Leiste nach außen ziehen. Für Trackpad-/Sidecar-Scrollgesten endet der Zug nach
einer kurzen Pause ohne weitere Scrollereignisse.

36 CSS-Pixel breite Eingabeflächen reservieren die Geste vor dem Folienwechsel.
Bei schwarzen Seitenrändern gibt es Griffe am Browserrand und am Folienrand.
Die Flächen werden bei Größen- und Vollbildwechseln neu positioniert. In
Arbeitsmodi (z. B. Zeichnen) und bei modalen Dialogen sind sie ausgeblendet.

Panels melden `edge: {side, command, element, viewport}` im bestehenden
Panelvertrag an. Dieses Modul enthält keine fremden DOM-Selektoren oder
Listen von Feature-Namen und öffnet Panels über die gemeinsame Modussteuerung.

Sidecar läuft mit dem Browser auf dem Mac, nicht mit Safari auf dem iPad.
Apple dokumentiert, dass direktes Fingerwischen Trackpad-Scrollereignisse
emulieren kann:
https://developer.apple.com/documentation/technotes/tn3212-adopting-gesture-recognizers-for-sidecar-touch-support
Je nach Systemversion sind die unterstützten Finger-Gesten unterschiedlich.
Systemgesten außerhalb des Browserinhalts kann die Extension nicht abfangen.
