import { describe, expect, it } from "vitest";
import {
  gradeChoiceAnswer,
  isUngradeableExpectedAnswer,
  resolveOptionIndex,
} from "@/lib/academy-grading";

const OPTS = [
  "Sinfoniera de procese operationale",
  "Un registru de vehicule",
  "Un raport financiar",
  "O procedura de audit",
];

describe("resolveOptionIndex", () => {
  it("maps a bare option letter", () => {
    expect(resolveOptionIndex("A", OPTS, "multiple_choice")).toBe(0);
    expect(resolveOptionIndex("b)", OPTS, "multiple_choice")).toBe(1);
    expect(resolveOptionIndex("3.", OPTS, "multiple_choice")).toBe(2);
  });

  it("maps full option text ignoring accents and punctuation", () => {
    expect(resolveOptionIndex("Sinfonieră de procese operaționale!", OPTS, "multiple_choice")).toBe(0);
  });

  it("maps English true/false onto localized options", () => {
    const tf = ["Adevărat", "Fals"];
    expect(resolveOptionIndex("True", tf, "true_false")).toBe(0);
    expect(resolveOptionIndex("False", tf, "true_false")).toBe(1);
    expect(resolveOptionIndex("Adevarat", tf, "true_false")).toBe(0);
  });

  it("returns null for an answer that is not among the options", () => {
    expect(resolveOptionIndex("ceva complet diferit", OPTS, "multiple_choice")).toBeNull();
  });
});

describe("gradeChoiceAnswer", () => {
  it("grades a text answer against a stored letter as correct", () => {
    const g = gradeChoiceAnswer(OPTS[0]!, "A", OPTS, "multiple_choice");
    expect(g).toMatchObject({ correct: true, scored: true, correctAnswerText: OPTS[0] });
  });

  it("grades a wrong pick and reports the full correct option text", () => {
    const g = gradeChoiceAnswer(OPTS[2]!, "A", OPTS, "multiple_choice");
    expect(g.correct).toBe(false);
    expect(g.correctAnswerText).toBe(OPTS[0]);
  });

  it("grades localized true/false against an English answer key", () => {
    const tf = ["Adevărat", "Fals"];
    expect(gradeChoiceAnswer("Adevărat", "True", tf, "true_false").correct).toBe(true);
    expect(gradeChoiceAnswer("Fals", "True", tf, "true_false").correct).toBe(false);
  });

  it("excludes a question whose answer key is a placeholder", () => {
    const g = gradeChoiceAnswer(OPTS[0]!, "See lesson content", OPTS, "multiple_choice");
    expect(g.scored).toBe(false);
  });
});

describe("isUngradeableExpectedAnswer", () => {
  it("detects placeholders and empty keys", () => {
    expect(isUngradeableExpectedAnswer("See lesson content")).toBe(true);
    expect(isUngradeableExpectedAnswer("")).toBe(true);
    expect(isUngradeableExpectedAnswer("Procedura de audit săptămânal")).toBe(false);
  });
});
