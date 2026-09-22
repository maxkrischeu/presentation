window.RevealPresentation = () => ({
  id: "presentation",
  init(deck) {
    deck.on("ready", () => {
      Presentation.ready = Presentation.start(deck).catch((error) => {
        console.error("Presentation initialization failed:", error);
        const message = document.createElement("div");
        message.className = "presentation-error";
        message.setAttribute("role", "alert");
        message.textContent = error.message;
        document.body.append(message);
        throw error;
      });
    });
  },
});
