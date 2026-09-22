window.RevealQuiz = function () {
  var keyCodes = {
    backspace: 8,
    tab: 9,
    enter: 13,
    shift: 16,
    ctrl: 17,
    alt: 18,
    pausebreak: 19,
    capslock: 20,
    esc: 27,
    space: 32,
    pageup: 33,
    pagedown: 34,
    end: 35,
    home: 36,
    leftarrow: 37,
    uparrow: 38,
    rightarrow: 39,
    downarrow: 40,
    insert: 45,
    delete: 46,
    0: 48,
    1: 49,
    2: 50,
    3: 51,
    4: 52,
    5: 53,
    6: 54,
    7: 55,
    8: 56,
    9: 57,
    a: 65,
    b: 66,
    c: 67,
    d: 68,
    e: 69,
    f: 70,
    g: 71,
    h: 72,
    i: 73,
    j: 74,
    k: 75,
    l: 76,
    m: 77,
    n: 78,
    o: 79,
    p: 80,
    q: 81,
    r: 82,
    s: 83,
    t: 84,
    u: 85,
    v: 86,
    w: 87,
    x: 88,
    y: 89,
    z: 90,
    leftwindowkey: 91,
    rightwindowkey: 92,
    selectkey: 93,
    numpad0: 96,
    numpad1: 97,
    numpad2: 98,
    numpad3: 99,
    numpad4: 100,
    numpad5: 101,
    numpad6: 102,
    numpad7: 103,
    numpad8: 104,
    numpad9: 105,
    multiply: 106,
    add: 107,
    subtract: 109,
    decimalpoint: 110,
    divide: 111,
    f1: 112,
    f2: 113,
    f3: 114,
    f4: 115,
    f5: 116,
    f6: 117,
    f7: 118,
    f8: 119,
    f9: 120,
    f10: 121,
    f11: 122,
    f12: 123,
    numlock: 144,
    scrolllock: 145,
    semicolon: 186,
    equalsign: 187,
    comma: 188,
    dash: 189,
    period: 190,
    forwardslash: 191,
    graveaccent: 192,
    openbracket: 219,
    backslash: 220,
    closebracket: 221,
    singlequote: 222,
  };

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
  }

  const plugin = {
    id: "RevealQuiz",
    init: function (deck) {
      // Remove live-only results before Reveal builds its PDF pages and frame counts.
      if (
        new URLSearchParams(window.location.search).has("print-pdf") ||
        document.documentElement.classList.contains("print-pdf")
      ) {
        deck
          .getSlidesElement()
          .querySelectorAll("section.quiz-results")
          .forEach((slide) => slide.remove());
      }
      const config = deck.getConfig();
      const options = config.quiz || {};

      var settings = {};

      let buttonContainer = document.createElement("div"); // Step 1: Create a div container
      buttonContainer.classList.add("button-container"); // Optionally, add a class for styling

      let checkButton = document.createElement("button");
      let resetButton = document.createElement("button");
      const againButton = document.createElement("button");
      againButton.className = "again-button action-buttons";
      againButton.textContent = Presentation.t("Again");
      againButton.title = Presentation.t(
        "Try this question again without changing your score",
      );
      resetButton.title = Presentation.t(
        "Reset all questions and scores for a new class",
      );
      let prevButton = document.createElement("button");
      let nextButton = document.createElement("button");
      let feedbackElement = document.createElement("div");

      checkButton.classList.add("check-button");
      resetButton.classList.add("reset-button");
      prevButton.classList.add("prev-button");
      nextButton.classList.add("next-button");
      feedbackElement.classList.add("feedback");

      checkButton.innerHTML = Presentation.t("Check");
      resetButton.innerHTML = Presentation.t("Reset");
      prevButton.innerHTML = Presentation.t("Prev");
      nextButton.innerHTML = Presentation.t("Next");
      feedbackElement.innerHTML = "";

      checkButton.classList.add("action-buttons");
      resetButton.classList.add("action-buttons");
      prevButton.classList.add("action-buttons");
      nextButton.classList.add("action-buttons");

      settings.shuffleKey = options.shuffleKey
        ? options.shuffleKey.toLowerCase()
        : "t";
      settings.shuffleKeyCode = keyCodes[settings.shuffleKey] || 84;

      (options.presentationKeyboard ? () => {} : deck.addKeyBinding.bind(deck))(
        { keyCode: settings.shuffleKeyCode, key: settings.shuffleKey },
        () => {
          deck.shuffle();
          deck.slide(0, 0, 0);
        },
      );

      settings.checkKey = options.checkKey
        ? options.checkKey.toLowerCase()
        : "c";
      settings.checkKeyCode = keyCodes[settings.checkKey] || 67;

      (options.presentationKeyboard ? () => {} : deck.addKeyBinding.bind(deck))(
        { keyCode: settings.checkKeyCode, key: settings.checkKey },
        () => {
          let currentSlide = deck.getCurrentSlide();
          let checkBtn = currentSlide.querySelector(".check-button");
          checkBtn.click();
        },
      );

      settings.resetKey = options.resetKey
        ? options.resetKey.toLowerCase()
        : "r";
      settings.resetKeyCode = keyCodes[settings.resetKey] || 82;

      (options.presentationKeyboard ? () => {} : deck.addKeyBinding.bind(deck))(
        { keyCode: settings.resetKeyCode, key: settings.resetKey },
        () => {
          let currentSlide = deck.getCurrentSlide();
          let resetBtn = currentSlide.querySelector(".reset-button");
          resetBtn.click();
        },
      );

      settings.allowNumberKeys = options.allowNumberKeys ?? true;

      settings.disableOnCheck = options.disableOnCheck || false;
      settings.disableReset = options.disableReset || false;

      settings.shuffleOptions = options.shuffleOptions || false;

      settings.defaultCorrect =
        options.defaultCorrect || Presentation.t("Correct!");
      settings.defaultIncorrect =
        options.defaultIncorrect || Presentation.t("Incorrect!");

      settings.includeScore = options.includeScore || false;

      console.log(settings);

      const scores = new Map();
      const sessionQuestions = [];
      const resetQuestions = [];
      const resetAll = () => {
        scores.clear();
        resetQuestions.forEach((reset) => reset());
        updateScores();
      };
      const questions = deck
        .getSlides()
        .filter((slide) => slide.classList.contains("quiz-question"));
      questions.forEach((slide, index) => {
        const heading = slide.querySelector(
          ":scope > h1, :scope > h2, :scope > h3",
        );
        if (!heading || heading.querySelector(".presentation-quiz-number"))
          return;
        const number = document.createElement("span");
        number.className = "presentation-quiz-number";
        number.textContent = `${index + 1}. `;
        heading.prepend(number);
      });
      const maximum = (slide) =>
        slide.classList.contains("quiz-multiple")
          ? Array.from(slide.querySelectorAll("li")).filter((option) =>
              option.querySelector("span.correct"),
            ).length
          : 1;
      // Optional intro uses the same question set and maximum as the results slide.
      deck
        .getSlides()
        .filter((slide) => slide.classList.contains("quiz-intro"))
        .forEach((slide) => {
          const root = document.createElement("div");
          root.className = "presentation-quiz-intro";
          const heading = slide.querySelector(
            ":scope > h1, :scope > h2, :scope > h3",
          );
          if (!heading) return;
          heading.classList.add("presentation-quiz-intro-title");
          root.append(heading);
          const subtitle = slide.dataset.quizSubtitle;
          if (subtitle !== "false") {
            const stats = document.createElement("p");
            stats.className = "presentation-quiz-intro-stats";
            const max = questions.reduce(
              (sum, question) => sum + maximum(question),
              0,
            );
            stats.textContent =
              subtitle ??
              `${questions.length} ${Presentation.t(questions.length === 1 ? "Question" : "Questions")} · ${max} ${Presentation.t(max === 1 ? "Point" : "Points")}`;
            root.append(stats);
          }
          slide.append(root);
        });
      const results = deck
        .getSlides()
        .filter((slide) => slide.classList.contains("quiz-results"))
        .map((slide) => {
          const root = document.createElement("div");
          root.className = "presentation-quiz-results";
          const total = document.createElement("div");
          total.className = "presentation-quiz-total";
          const label = document.createElement("div");
          label.className = "presentation-quiz-total-label";
          label.textContent = Presentation.t("Total score");
          const value = document.createElement("div");
          value.className = "presentation-quiz-total-value";
          value.setAttribute("aria-live", "polite");
          const progress = document.createElement("div");
          progress.className = "presentation-quiz-total-progress";
          progress.setAttribute("aria-hidden", "true");
          progress.append(document.createElement("span"));
          const status = document.createElement("p");
          status.className = "presentation-quiz-total-status";
          total.append(label, value, progress, status);
          const list = document.createElement("ol");
          list.className = "presentation-quiz-result-list";
          list.tabIndex = 0;
          list.setAttribute(
            "aria-label",
            Presentation.t("Quiz results by question"),
          );
          list.dataset.preventSwipe = "true";
          list.addEventListener("wheel", (event) => event.stopPropagation());
          const rows = questions.map((question, index) => {
            const row = document.createElement("li");
            const text = document.createElement("div");
            const title = document.createElement("strong");
            title.textContent = Presentation.t("{number}. Question:", {
              number: index + 1,
            });
            const detail = document.createElement("span");
            detail.className = "presentation-quiz-question-preview";
            detail.textContent =
              question.querySelector(":scope > p")?.textContent ||
              question.querySelector("h2,h1")?.textContent ||
              "";
            text.append(title, detail);
            const points = document.createElement("span");
            points.className = "presentation-quiz-question-points";
            row.append(text, points);
            list.append(row);
            return { question, points };
          });
          const showTotal = slide.dataset.quizTotal !== "false";
          const showQuestions = slide.dataset.quizQuestions !== "false";
          root.dataset.layout =
            showTotal && showQuestions
              ? "both"
              : showTotal
                ? "total"
                : showQuestions
                  ? "questions"
                  : "none";
          if (showTotal) root.append(total);
          if (showQuestions) root.append(list);
          slide.append(root);
          return { slide, value, progress, status, rows };
        });
      const updateScores = () => {
        const total = Array.from(scores.values()).reduce(
          (sum, value) => sum + value,
          0,
        );
        const max = questions.reduce((sum, slide) => sum + maximum(slide), 0);
        results.forEach((result) => {
          result.value.textContent = `${total} / ${max}`;
          result.progress.firstElementChild.style.width = `${max ? (total / max) * 100 : 0}%`;
          result.status.textContent = Presentation.t(
            "{checked} of {total} questions checked",
            { checked: scores.size, total: questions.length },
          );
          result.rows.forEach(({ question, points }) => {
            points.textContent = `${scores.get(question) || 0} / ${maximum(question)}`;
            points.title = scores.has(question)
              ? Presentation.t("Points earned")
              : Presentation.t("Not checked yet");
          });
        });
        deck
          .getSlidesElement()
          .querySelectorAll(".quiz-question .score")
          .forEach((element) => {
            element.textContent = Presentation.t("Score: {score}", {
              score: total,
            });
          });
      };

      deck.getSlides().forEach((slide, index) => {
        let quizQuestion = slide.classList.contains("quiz-question");
        if (quizQuestion) {
          let cloneCheckBtn = checkButton.cloneNode(true);
          let cloneResetBtn = resetButton.cloneNode(true);
          const cloneAgainBtn = againButton.cloneNode(true);
          let clonePrevBtn = prevButton.cloneNode(true);
          let cloneNextBtn = nextButton.cloneNode(true);
          let cloneFeedbackElement = feedbackElement.cloneNode(true);
          let cloneButtonContainer = buttonContainer.cloneNode(true);

          let selectedOptions = [];
          let isAnswered = false;
          let isMultipleChoice = slide.classList.contains("quiz-multiple");

          // ensure each list element has a class of 'option-button'
          let options = slide.querySelectorAll("li");
          options.forEach((opt) => {
            opt.classList.add("option-button");
          });

          if (settings.shuffleOptions) {
            options = shuffleArray(Array.from(options));
            options.forEach((opt) => {
              slide.appendChild(opt);
            });
          }

          // Native Reveal fragments: question first, then answers in display order.
          // Controls and feedback share the final answer's step (also on rewind).
          const revealAt = (element, index) => {
            element.classList.add("fragment");
            element.dataset.fragmentIndex = String(index);
          };
          Array.from(slide.children)
            .filter(
              (element) =>
                !element.matches(
                  "h1,h2,h3,h4,h5,h6,ul,ol,aside,template,script,style",
                ) && !element.querySelector(".option-button"),
            )
            .forEach((element) => revealAt(element, 0));
          options.forEach((option, index) => revealAt(option, index + 1));
          revealAt(cloneButtonContainer, options.length);
          // Feedback inherits the controls' fragment instead of adding a step.
          cloneFeedbackElement.setAttribute("role", "status");

          function resetQuiz() {
            cloneCheckBtn.disabled = false;
            options.forEach((opt) => {
              opt.classList.remove("selected", "correct", "incorrect");
              opt.disabled = false;
            });
            selectedOptions = [];
            isAnswered = false;
            cloneFeedbackElement.textContent = "";
          }

          resetQuestions.push(resetQuiz);
          cloneAgainBtn.addEventListener("click", resetQuiz);
          cloneResetBtn.disabled = settings.disableReset;

          options.forEach((option) => {
            option.addEventListener("click", function () {
              if (!isAnswered) {
                // Changing the selection invalidates the previous assessment.
                options.forEach((opt) =>
                  opt.classList.remove("correct", "incorrect"),
                );
                cloneFeedbackElement.textContent = "";
                if (isMultipleChoice) {
                  // Multiple choice: toggle selection
                  if (this.classList.contains("selected")) {
                    this.classList.remove("selected");
                    selectedOptions = selectedOptions.filter(
                      (opt) => opt !== this,
                    );
                  } else {
                    this.classList.add("selected");
                    selectedOptions.push(this);
                  }
                } else {
                  // Single choice: only one selection allowed
                  options.forEach((opt) => opt.classList.remove("selected"));
                  this.classList.add("selected");
                  selectedOptions = [this];
                }
                cloneCheckBtn.disabled = selectedOptions.length === 0;
              }
            });
          });
          if (!settings.disableReset) {
            cloneResetBtn.addEventListener("click", resetAll);
          }
          clonePrevBtn.addEventListener("click", () => {
            console.log("clicked prev slide");
            deck.prev();
          });
          cloneNextBtn.addEventListener("click", () => {
            console.log("clicked next slide");
            deck.next();
          });
          slide.appendChild(cloneButtonContainer);
          const actionGroup = document.createElement("div");
          actionGroup.className = "quiz-action-group";
          actionGroup.append(cloneCheckBtn, cloneAgainBtn, cloneResetBtn, clonePrevBtn, cloneNextBtn);
          cloneButtonContainer.append(cloneFeedbackElement, actionGroup);

          if (settings.includeScore) {
            let scoreElement = document.createElement("div");
            scoreElement.classList.add("score");
            scoreElement.setAttribute("role", "status");
            scoreElement.setAttribute(
              "aria-label",
              Presentation.t("Total quiz score"),
            );
            cloneButtonContainer.prepend(scoreElement);
            updateScores();
          }

          // A stable middle region reserves room for a subsequently placed image.
          // Fragment visibility never changes the space occupied by the answers.
          if (slide.classList.contains("quiz-image")) {
            const layout = document.createElement("div");
            layout.className = "quiz-image-layout";
            const question = document.createElement("div");
            question.className = "quiz-image-question";
            const area = document.createElement("div");
            area.className = "quiz-image-area";
            area.setAttribute("aria-hidden", "true");
            const answers = document.createElement("div");
            answers.className = "quiz-image-answers";
            for (const child of Array.from(slide.children)) {
              if (child === cloneButtonContainer || child.matches("ul,ol,.option-button")) {
                answers.append(child);
              } else if (!child.matches("aside,template,script,style")) {
                question.append(child);
              }
            }
            layout.append(question, area, answers);
            slide.append(layout);
          }

          cloneCheckBtn.addEventListener("click", function () {
            console.log("clicked check");
            if (selectedOptions.length > 0 && !isAnswered) {
              isAnswered = true;

              if (isMultipleChoice) {
                // Only evaluate the chosen answers; do not reveal the others.
                const selectedCorrect = selectedOptions.filter((opt) =>
                  opt.querySelector("span.correct"),
                );
                options.forEach((opt) =>
                  opt.classList.remove("correct", "incorrect"),
                );
                selectedOptions.forEach((opt) => {
                  opt.classList.add(
                    opt.querySelector("span.correct") ? "correct" : "incorrect",
                  );
                });
                const correctCount = Array.from(options).filter((opt) =>
                  opt.querySelector("span.correct"),
                ).length;
                const allSelectedCorrect =
                  selectedCorrect.length === correctCount &&
                  selectedCorrect.length === selectedOptions.length;
                const partiallyCorrect =
                  !allSelectedCorrect && selectedCorrect.length > 0;
                cloneFeedbackElement.textContent = allSelectedCorrect
                  ? settings.defaultCorrect
                  : partiallyCorrect
                    ? Presentation.t("Partly correct!")
                    : settings.defaultIncorrect;
                cloneFeedbackElement.style.color = allSelectedCorrect
                  ? "#27ae60"
                  : partiallyCorrect
                    ? "#a87600"
                    : "#c0392b";
              } else {
                // Single choice logic (original)
                let selectedOption = selectedOptions[0];
                let isCorrect =
                  selectedOption.querySelector("span") &&
                  selectedOption
                    .querySelector("span")
                    .classList.contains("correct");
                let hasExplanation =
                  selectedOption.querySelector("span") &&
                  selectedOption
                    .querySelector("span")
                    .hasAttribute("data-explanation");
                let explanation = null;
                if (hasExplanation) {
                  explanation = selectedOption
                    .querySelector("span")
                    .getAttribute("data-explanation");
                }
                if (isCorrect) {
                  selectedOption.classList.add("correct");
                  cloneFeedbackElement.textContent =
                    explanation || settings.defaultCorrect;
                  cloneFeedbackElement.style.color = "#27ae60";
                } else {
                  selectedOption.classList.add("incorrect");
                  cloneFeedbackElement.textContent =
                    explanation || settings.defaultIncorrect;
                  cloneFeedbackElement.style.color = "#c0392b";
                }
              }

              // Only the first checked attempt counts, including a zero-point attempt.
              if (!scores.has(slide)) {
                scores.set(
                  slide,
                  selectedOptions.filter((option) =>
                    option.querySelector("span.correct"),
                  ).length,
                );
              }
              updateScores();

              if (settings.disableOnCheck) {
                cloneCheckBtn.disabled = true;
                cloneResetBtn.disabled = false;
                cloneNextBtn.disabled = false;
                options.forEach((opt) => (opt.disabled = true));
              } else {
                isAnswered = false;
                cloneCheckBtn.disabled = false;
                options.forEach((opt) => (opt.disabled = false));
              }

              if (settings.disableReset) {
                cloneResetBtn.disabled = true;
              }
            }
          });

          sessionQuestions.push({
            slide,
            capture: () => ({
              slide: slide.id,
              selected: Array.from(options)
                .map((opt, i) => (selectedOptions.includes(opt) ? i : null))
                .filter((i) => i !== null),
              checked: isAnswered,
              score: scores.has(slide) ? scores.get(slide) : null,
            }),
            restore: (entry) => {
              entry.selected.forEach((i) => options[i]?.click());
              if (entry.checked) cloneCheckBtn.click();
              if (entry.score !== null) scores.set(slide, entry.score);
            },
          });

          if (settings.allowNumberKeys) {
            document.addEventListener("keydown", function (event) {
              // Assuming option buttons have class names like 'option-button' and are meant to be selected in order
              // const optionButtons = document.querySelectorAll('.option-button');

              // The key values for number keys are '1', '2', '3', etc.
              // Convert the key to an index (e.g., '1' becomes 0)
              const index = parseInt(event.key, 10) - 1;

              // Check if the pressed key is a number that corresponds to an option button
              if (index >= 0 && index < options.length) {
                // Simulate a click on the corresponding option button
                // only simulate on the current slide
                let currentSlide = deck.getCurrentSlide();
                let optionButtons =
                  currentSlide.querySelectorAll(".option-button");
                optionButtons[index].click();
              }
            });
          }
        }
      });
      for (const entry of Presentation.session.saved("quiz") || [])
        sessionQuestions
          .find((q) => q.slide.id === entry.slide)
          ?.restore(entry);

      plugin.reset = resetAll;
      plugin.snapshot = () => sessionQuestions.map((q) => q.capture());
      updateScores();
    },
  };
  return plugin;
};
