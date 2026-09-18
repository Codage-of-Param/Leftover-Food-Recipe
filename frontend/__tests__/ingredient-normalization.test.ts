import { describe, it, expect } from "vitest";
import { extractIngredients, STOP_WORDS } from "../utils/ingredientParser";

describe("Ingredient Normalization", () => {
  it("should extract simple ingredients", () => {
    const input = "I have carrots and peas";
    const result = extractIngredients(input);
    expect(result).toEqual(["carrots", "peas"]);
  });

  it("should strip out stop words like 'please', 'make', 'recipe'", () => {
    const input = "Please make a delicious recipe with leftover rice and chicken";
    const result = extractIngredients(input);
    // "please", "make", "a", "delicious", "recipe", "with", "leftover", "and" are stripped
    expect(result).toEqual(["rice", "chicken"]);
  });

  it("should handle commas and weird punctuation", () => {
    const input = "tomatoes, ONIONS!! , and garlic...";
    const result = extractIngredients(input);
    expect(result).toEqual(["tomatoes", "onions", "garlic"]);
  });

  it("should handle empty inputs gracefully", () => {
    expect(extractIngredients("")).toEqual([]);
    expect(extractIngredients("    ")).toEqual([]);
  });

  it("should ignore words that are just stop words without panicking", () => {
    expect(extractIngredients("please make food")).toEqual([]);
  });

  it("should handle mixed case and duplicate ingredients", () => {
    const input = "Rice and RICE and rice";
    const result = extractIngredients(input);
    expect(result).toEqual(["rice"]);
  });
});
