import { describe, it, expect } from "vitest";
import { calculateRescueScore } from "../utils/scoreEngine";

describe("Rescue Score Mathematical Engine", () => {
  it("should return 0 if no ingredients are provided", () => {
    expect(calculateRescueScore([])).toBe(0);
  });

  it("should return 100 for a perfect match (all pantry items)", () => {
    const ingredients = [
      { name: "rice", inPantry: true },
      { name: "beans", inPantry: true }
    ];
    // Base 100, missing 0, pantry matches 2 (<3 so no bonus) => 100
    expect(calculateRescueScore(ingredients)).toBe(100);
  });

  it("should calculate base ratio correctly (50%)", () => {
    const ingredients = [
      { name: "rice", inPantry: true },
      { name: "beans", inPantry: false }
    ];
    // Matches 1 out of 2. Ratio = 50. Missing = 1.
    expect(calculateRescueScore(ingredients)).toBe(50);
  });

  it("should apply +5 bonus for using >= 3 pantry items", () => {
    const ingredients = [
      { name: "rice", inPantry: true },
      { name: "beans", inPantry: true },
      { name: "chicken", inPantry: true },
      { name: "salt", inPantry: false }
    ];
    // 3/4 = 75%. Matches = 3 (bonus +5). Missing = 1. Total = 80.
    expect(calculateRescueScore(ingredients)).toBe(80);
  });

  it("should apply -10 penalty for requiring >= 5 missing ingredients", () => {
    const ingredients = [
      { name: "rice", inPantry: true }, // 1 match
      { name: "salt", inPantry: false },
      { name: "pepper", inPantry: false },
      { name: "oil", inPantry: false },
      { name: "garlic", inPantry: false },
      { name: "onion", inPantry: false } // 5 missing
    ];
    // 1/6 = 17%. Penalty -10 for >= 5 missing. Total = 7.
    expect(calculateRescueScore(ingredients)).toBe(7);
  });

  it("should bound the score strictly between 0 and 100", () => {
    const perfectBonus = [
      { name: "1", inPantry: true },
      { name: "2", inPantry: true },
      { name: "3", inPantry: true },
    ];
    // 100% + 5 bonus = 105, should bound to 100
    expect(calculateRescueScore(perfectBonus)).toBe(100);

    const terriblePenalty = [
      { name: "a", inPantry: false },
      { name: "b", inPantry: false },
      { name: "c", inPantry: false },
      { name: "d", inPantry: false },
      { name: "e", inPantry: false },
    ];
    // 0% - 10 penalty = -10, should bound to 0
    expect(calculateRescueScore(terriblePenalty)).toBe(0);
  });
});
