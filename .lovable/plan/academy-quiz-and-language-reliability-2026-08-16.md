# Academy quiz and language reliability

## Goal
Make quiz startup visibly responsive and ensure both the AI Teacher and generated quizzes use the learner's selected language consistently and grammatically.

## Changes
1. Normalize and validate Academy language codes server-side against the supported language catalog.
2. Strengthen the AI Teacher prompt so the selected language overrides the source lesson and conversation history; prevent mixed-language output except immutable technical terms.
3. Rework quiz generation to use the fast chat capability, explicit locale names, concise source context, and strict single-language instructions to reduce waiting time.
4. Validate generated quiz text for wrong-script leakage; retry once with a correction prompt, then use a localized source-grounded fallback instead of showing a quiz in the wrong language.
5. Add a quiz loading state, disable duplicate starts, and show clear progress/error feedback in the lesson UI.
6. Keep true/false controls and fallback quiz copy localized in the selected language.

## Verification
- Exercise Romanian quiz generation and confirm no Cyrillic/Russian text appears.
- Confirm the Start quiz button immediately enters a loading state and cannot submit twice.
- Run the relevant Academy tests/type checks supplied by the project harness.
