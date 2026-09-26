/* Modal confirmations stay in the document's top layer, including fullscreen. */
Presentation.register({
  id: "dialogs",
  interactiveOnly: true,
  setup({t}) {
    let active = false;
    return {
      confirm({title, message, label}) {
        if (active) return Promise.resolve(false);
        active = true;
        const previous = document.activeElement;
        const dialog = document.createElement("dialog");
        dialog.className = "presentation-confirm-dialog";
        dialog.setAttribute("aria-labelledby", "presentation-confirm-title");
        dialog.setAttribute("aria-describedby", "presentation-confirm-message");
        const form = document.createElement("form");
        form.method = "dialog";
        const heading = document.createElement("h2");
        heading.id = "presentation-confirm-title";
        heading.textContent = title;
        const description = document.createElement("p");
        description.id = "presentation-confirm-message";
        description.textContent = message;
        const actions = document.createElement("div");
        actions.className = "presentation-confirm-actions";
        const cancel = document.createElement("button");
        cancel.type = "submit";
        cancel.value = "cancel";
        cancel.autofocus = true;
        cancel.textContent = t("Cancel");
        const accept = document.createElement("button");
        accept.type = "submit";
        accept.value = "confirm";
        accept.textContent = label;
        actions.append(cancel, accept);
        form.append(heading, description, actions);
        dialog.append(form);
        document.body.append(dialog);
        return new Promise((resolve, reject) => {
          const cleanup = () => {
            dialog.remove();
            active = false;
            if (previous?.isConnected) previous.focus({preventScroll: true});
          };
          dialog.addEventListener("close", () => {
            const confirmed = dialog.returnValue === "confirm";
            cleanup();
            resolve(confirmed);
          }, {once: true});
          try { dialog.showModal(); }
          catch (error) { cleanup(); reject(error); }
        });
      },
    };
  },
});
