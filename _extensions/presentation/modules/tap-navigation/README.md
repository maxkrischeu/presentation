# Tap navigation

In normal presentation mode, both windowed and fullscreen, a short tap on the right third of the slide advances
one fragment or slide; the left third goes back. Primary mouse clicks also work
so Sidecar's translated finger input can use the same interaction.

Navigation is inactive while a tool, panel or slide overview is open. Links,
controls, media players, editable content and elements marked with
`data-presentation-navigation="local"` keep their own input handling.
Drags, long presses and text selections do not navigate.

The middle third does not navigate or consume clicks, leaving actions such as
clearing a quiz selection available.
