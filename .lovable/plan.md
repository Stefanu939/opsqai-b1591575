# Academy quiz grading repair

## Confirmed cause

The quiz answers are compared as raw text, and the two sides never match:

- The generator is told to return `correct_answer` as `"A"` (see the JSON shape it is
  given in `src/lib/academy.functions.ts:739`), so what is stored is often just a
  letter, sometimes the full option text, sometimes a paraphrase.
- The lesson screen submits the **full option text** the learner clicked
  (`src/routes/_authenticated/app.academy.lesson.$lessonId.tsx:578`).
- Grading is a plain lowercase string comparison
  (`src/lib/academy.functions.ts:844`), so "Sinfoniera de procese…" never equals "A".
  That is exactly the screenshot: correct choice marked wrong, and "Correct: A".
- True/false has the same problem when the option labels are localized
  ("Adevărat"/"Fals") but the stored answer is "True"/"False".
- The short-answer question shows "Correct: See lesson content" — that is the
  fallback value used when the model omits an answer, so it can never be graded
  fairly.

## Options

### A. Index-based grading (recommended, keeps mixed question types)
Store the correct answer as a **numeric option index** plus its text, and have the
browser submit the index instead of free text.
- Generation asks for `correct_index` (0-3) and validates it points at a real option;
  a letter or an option text still gets normalized into an index.
- True/false becomes a two-option question with a fixed index, so localized labels
  cannot break it.
- Short answer keeps AI meaning-based grading, but a question with no usable expected
  answer is dropped at generation time instead of being asked and failed.
- Review shows the correct option in full, in the learner's language, never "A".

### B. All questions true/false only
Simplest and near unbreakable: every generated question becomes a statement with
Adevărat/Fals, graded on a boolean stored server-side. No option-letter ambiguity, no
AI short-answer grading. Cost: much shallower assessment, and 50% guess rate, so the
pass mark would need raising.

### C. Both: index-based grading now, with a per-course "true/false only" switch
A plus an Academy setting so a course can be set to true/false-only mode when a
simpler check is wanted. Most work of the three.

## Also fixed in every option

- Answers already given are re-validated on submit: if a stored question is
  ungradeable, it is excluded from the score instead of counted as wrong.
- Retry ("Try again") reuses the same attempt questions; "New questions" generates a
  fresh set — today both paths can silently mix answer formats.
- Score line states the pass mark as the quiz threshold, unchanged.

## Technical notes

- `QuestionSchema` gains `correct_index: number | null` alongside `correct_answer`;
  generation maps letters ("A"/"a)"/"1") and exact/fuzzy option text into an index,
  and rejects a question whose answer cannot be located in its options.
- Client submits `{ index, text }` per question; `submitAcademyQuiz` grades by index
  for choice/true-false, and only falls back to text comparison for legacy attempts
  already stored in the database (backward compatible, no migration needed).
- Short answer: keep `chat` grading, tighten the prompt to answer strictly YES/NO, and
  treat a missing expected answer as "not scored".
- No schema, licensing, RBAC or Cloud behaviour changes; quiz answers continue to be
  stripped before reaching the browser.
- Verification: new unit tests for answer-index normalization (letters, localized
  true/false, paraphrased text), existing Academy language tests, typecheck and build,
  plus one manual Romanian quiz run confirming correct picks score as correct.
