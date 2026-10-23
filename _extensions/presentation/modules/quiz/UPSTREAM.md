Source: https://github.com/parmsam/quarto-quiz
Revision: 3f24a8a7022bc8ef149c279a5a88f188b2f39af7

Local adaptations: keyboard registration delegated to Presentation; allowNumberKeys respects false.
Choice quiz slides reveal authored content blocks and individual answers in QMD order as native Reveal fragments; Check/Again/Reset and feedback share the last answer step.

Multiple-answer checks evaluate and mark only selected answers, without revealing unselected answers. Changing selection clears stale feedback.

Score sums correctly selected answers across quiz slides; the first checked attempt is locked (including zero points). Again clears only the current answer; subsequent checks and selection changes preserve scores. Reset clears all questions and scores for a new class. Score shares the Check/Again/Reset row and reveal step.

Multiple-choice overall feedback requires the exact correct set for green Correct!; any other selection containing a correct answer gets amber Partly correct!. Selected-only per-answer feedback remains unchanged.


Results use one bounded scrollable list, with a vertically centered total card. Live-only result sections are removed during quiz initialization in print-pdf mode, before framing and PDF pagination.

Optional `quiz.cards` adds green/yellow/red/blue card markers to up to four
choice answers in their final display order, including shuffled and image
answers. Markers reserve their own space inside the answer and do not depend
on selection, correctness, retry or score. Cloze and larger answer sets omit them.

Text answers use separate number and text columns for hanging indentation,
including multi-paragraph answers. Choice questions reveal blocks in authored
QMD order, including free-image source anchors, interleaved prose and answer
lists. Containers without answer lists stay atomic; lists reveal answer by answer.
Controls still share the final answer's step. Inert resource entries remain excluded.

An optional countdown uses a monotonic deadline, starts after the final answer
fragment and pauses outside the visible question, on rewind, overview, blackout,
printing or explicit pause. Timeout submits the current choice/partial cloze,
records a zero for no response, reveals solutions and locks the attempt. Manual
submission also finishes a timed attempt. Again and Reset retain their existing
first-attempt scoring semantics. Timer state and timeout feedback are included
in question snapshots. Live timers are omitted from print output. Removing a
last results section for print retains inert document resources placed there
by Pandoc, including templates and hidden resource links.
