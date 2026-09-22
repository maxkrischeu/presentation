Source: https://github.com/parmsam/quarto-quiz
Revision: 3f24a8a7022bc8ef149c279a5a88f188b2f39af7

Local adaptations: keyboard registration delegated to Presentation; allowNumberKeys respects false.
Quiz slides automatically reveal the question, then each answer as native Reveal fragments; Check/Again/Reset and feedback share the last answer step.

Multiple-answer checks evaluate and mark only selected answers, without revealing unselected answers. Changing selection clears stale feedback.

Score sums correctly selected answers across quiz slides; the first checked attempt is locked (including zero points). Again clears only the current answer; subsequent checks and selection changes preserve scores. Reset clears all questions and scores for a new class. Score shares the Check/Again/Reset row and reveal step.

Multiple-choice overall feedback requires the exact correct set for green Correct!; any other selection containing a correct answer gets amber Partly correct!. Selected-only per-answer feedback remains unchanged.


Results use one bounded scrollable list, with a vertically centered total card. Live-only result sections are removed during quiz initialization in print-pdf mode, before framing and PDF pagination.
