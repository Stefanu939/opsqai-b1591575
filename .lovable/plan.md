# Two fixes: Self-Hosted time off + Academy progress & quiz

## Part 1 — Time off cannot be requested (Self-Hosted)

Cause confirmed: the Self-Hosted database table for requests was created without
the calendar-link field, while the code reads and writes it, so saving fails with
`column "calendar_event_id" does not exist`. The Cloud database has the field, so
Cloud is unaffected.

Options:

**A. Minimal repair** — add the missing field (and the decision-note field) in a
new Self-Hosted migration. Requesting time off works immediately.

**B. Repair + complete approval flow (recommended)** — A, plus an approvals inbox
for company Admin/SuperAdmin (approve, reject with note, cancel), self-approval
for SuperAdmins, calendar event created on approval and removed on
rejection/cancel, and an overlap warning for colliding periods.

**C. B + team absence view** — company-wide absence list and month strip, with
CSV export of approved periods.

## Part 2 — Academy: progress and quiz architecture

Confirmed in the code today:
- The progress bar is computed from elapsed time versus estimated minutes
  (`elapsedMin / estimated * 70`), which is exactly what must stop.
- The quiz engine already keeps correct answers server-side: generated answers
  are stored with the attempt and stripped before reaching the browser, and
  grading happens server-side. The leak seen in the screenshots comes from the
  AI Teacher writing its own quiz with an answer key inside the lesson chat.
- `Pass 70%` already reads the course/company passing score, but it sits next to
  the progress bar, so it looks like a progress figure.

### Progress model options

**P1. Deterministic learning units (recommended)**
Progress = completed units / total units, each unit equal. Units are the lesson
sections actually walked through (Introduction, Key Concepts, Practical Example,
Best Practices, Summary — whichever the lesson has) plus the quiz as the final
unit. Time never influences it. Estimated duration is shown separately as an
informational line, never inside the progress card.

**P2. Weighted units**
Same as P1, but the quiz carries a configurable weight (for example lesson 60% /
quiz 40%) set per course in Academy settings.

**P3. Checklist progress**
P1 plus a visible checklist of units with tick marks, so the learner sees exactly
which unit moved the bar; each unit is marked complete when the AI Teacher
confirms that section and the learner acknowledges it.

### Quiz mode options

**Q1. Separate quiz screen with explicit state machine (recommended)**
Explicit states `LEARNING → QUIZ_READY → QUIZ_IN_PROGRESS → QUIZ_COMPLETED`.
The AI Teacher is instructed never to produce quiz questions, options, answer
keys, or checkbox answer lists; if the learner asks for the quiz ("start quiz",
"go to the quiz", "skip to test", including German and Romanian phrasings), the
lesson chat hands over and the interactive quiz opens immediately — skipping the
lesson is allowed. One question at a time, selectable options, explicit Submit,
validation and score only after submission, threshold shown as the quiz pass
mark, result written back as the final progress unit.

**Q2. Q1 with a question list**
All questions on one page with selectable options and a single Submit at the end,
plus a progress strip showing answered/unanswered.

**Q3. Q1 plus exam controls (most enterprise)**
Q1, plus optional timer per attempt, attempt limits and retake cooldown from
Academy settings, per-question review with explanations after submission, and an
attempt history with score and pass/fail per try.

## Technical notes

- Self-Hosted migration `0031`: `ALTER TABLE public.time_off_requests ADD COLUMN
  IF NOT EXISTS calendar_event_id uuid`, `... decision_note text`, plus an index
  on `(company_id, status, starts_on)`. Self-Hosted only; no Cloud migration.
- Academy progress: replace the elapsed-time formula in
  `app.academy.lesson.$lessonId.tsx` with a unit-completion reducer; keep the
  remaining-minutes label outside the progress card; keep `Pass N%` labelled as
  the quiz threshold.
- Quiz separation: add explicit lesson state, an intent matcher for "go to quiz"
  in EN/DE/RO, and prompt rules in `src/routes/api/academy-chat.ts` forbidding
  question/answer-key output; keep the existing `generateAcademyQuiz` /
  `submitAcademyQuiz` server grading untouched, since correct answers already
  never reach the browser before submission.
- Options P2/P3 and Q3 add fields to existing Academy settings; no new tables.
- Verification: typecheck, build, existing Academy language tests, and a manual
  pass where the bar only moves on unit completion and asking for the quiz opens
  the interactive quiz.
