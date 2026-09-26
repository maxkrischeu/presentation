# Seitenleisten per Touch

Im normalen Präsentationsmodus öffnet eine horizontale Geste vom linken
Folienrand das Menü, vom rechten Rand die Medienbibliothek. Die Leiste folgt
dem Finger. Ein kurzer Zug zurück bricht ab; vom inneren Rand einer geöffneten
Leiste lässt sie sich wieder nach außen schieben.

Die Randzone ist 28 CSS-Pixel breit. Vertikale Bewegungen, mehrere Finger,
Eingabefelder und aktive Arbeitsmodi werden nicht übernommen. Die gewohnte
Bedienung durch Tastatur und Dock bleibt erhalten.

Panels melden `edge: {side, command, element, viewport}` in ihrem bestehenden
Panelvertrag an. Dieses Modul enthält keine fremden DOM-Selektoren oder
Listen von Feature-Namen und öffnet Panels über die gemeinsame Modussteuerung.
Die Browser-/System-Navigation am äußersten Bildschirmrand kann vom Betriebssystem
beansprucht werden; auf echten Touchgeräten zusätzlich innerhalb des Folienrands testen.
