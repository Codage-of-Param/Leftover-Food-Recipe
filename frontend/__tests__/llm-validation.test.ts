import { describe, it, expect } from "vitest";
import {
  extractJsonFromLlmOutput,
  validateAiRecipeResponse,
  getAllergenKeywords,
  checkRecipeViolatesAllergensOrDiet
} from "../utils/llmValidator";

describe("LLM Validator - JSON Extraction", () => {
  it("should extract a JSON array wrapped in markdown blocks", () => {
    const rawOutput = "Here are your recipes:\n```json\n[{\"title\": \"Test\"}]\n```\nEnjoy!";
    const extracted = extractJsonFromLlmOutput(rawOutput);
    expect(extracted).toBe('[{"title": "Test"}]');
  });

  it("should extract a JSON object containing a recipes array", () => {
    const rawOutput = "```\n{\"recipes\": [{\"title\": \"Test\"}]}\n```";
    const extracted = extractJsonFromLlmOutput(rawOutput);
    expect(extracted).toBe('{"recipes": [{"title": "Test"}]}');
  });

  it("should extract raw JSON without markdown blocks but with conversational padding", () => {
    const rawOutput = "Sure! Here is the JSON: [{\"title\": \"Test\"}] Hope you like it.";
    const extracted = extractJsonFromLlmOutput(rawOutput);
    expect(extracted).toBe('[{"title": "Test"}]');
  });
});

describe("LLM Validator - Schema Validation", () => {
  const validRecipe = {
    title: "Zero Waste Veggie Stir Fry",
    desc: "A quick and delicious way to use up leftover vegetables.",
    score: 95,
    difficulty: "Easy",
    prep_time: 10,
    cook_time: 15,
    servings: 2,
    cals: 350,
    protein: "10g",
    isVeg: true,
    ingredients: [
      { name: "Carrots", quantity: "2 cups", inPantry: true },
      { name: "Soy Sauce", quantity: "2 tbsp", inPantry: true }
    ],
    instructions: ["Chop veggies.", "Stir fry for 10 mins.", "Serve hot."]
  };

  it("should validate a perfectly formatted LLM response (array)", () => {
    const rawOutput = JSON.stringify([validRecipe]);
    const validated = validateAiRecipeResponse(rawOutput);
    expect(validated).toHaveLength(1);
    expect(validated[0].title).toBe("Zero Waste Veggie Stir Fry");
  });

  it("should validate a perfectly formatted LLM response (object with recipes array)", () => {
    const rawOutput = JSON.stringify({ recipes: [validRecipe] });
    const validated = validateAiRecipeResponse(rawOutput);
    expect(validated).toHaveLength(1);
    expect(validated[0].title).toBe("Zero Waste Veggie Stir Fry");
  });

  it("should throw an error if required fields are missing", () => {
    const invalidRecipe = { ...validRecipe };
    // @ts-ignore
    delete invalidRecipe.title;
    
    const rawOutput = JSON.stringify([invalidRecipe]);
    expect(() => validateAiRecipeResponse(rawOutput)).toThrow(/failed strict schema validation/);
  });

  it("should throw an error if types are completely wrong", () => {
    const invalidRecipe = { ...validRecipe, ingredients: "Just mix some stuff" }; // ingredients should be an array
    const rawOutput = JSON.stringify([invalidRecipe]);
    expect(() => validateAiRecipeResponse(rawOutput)).toThrow(/failed strict schema validation/);
  });
  
  it("should throw an error for unparseable garbage", () => {
    const rawOutput = "This is not JSON at all.";
    expect(() => validateAiRecipeResponse(rawOutput)).toThrow(/Failed to parse LLM output as JSON/);
  });
});

describe("Substitution & Constraint Validation", () => {
  it("should correctly generate allergen keywords", () => {
    const keywords = getAllergenKeywords(["Dairy", "Peanuts: crunchy", "soy"]);
    expect(keywords).toContain("milk");
    expect(keywords).toContain("cheese");
    expect(keywords).toContain("peanut");
    expect(keywords).toContain("crunchy");
    expect(keywords).toContain("tofu");
  });

  it("should flag recipes that violate allergens in ingredients", () => {
    const recipe = {
      title: "Peanut Butter Noodles",
      ingredients: [{ name: "peanut butter" }, { name: "noodles" }]
    };
    const violates = checkRecipeViolatesAllergensOrDiet(recipe, ["peanut"], "Any");
    expect(violates).toBe(true);
  });

  it("should flag recipes that violate allergens in instructions", () => {
    const recipe = {
      title: "Noodles",
      ingredients: [{ name: "noodles" }],
      instructions: ["Mix with peanut butter."]
    };
    const violates = checkRecipeViolatesAllergensOrDiet(recipe, ["peanut"], "Any");
    expect(violates).toBe(true);
  });

  it("should pass safe recipes", () => {
    const recipe = {
      title: "Garlic Noodles",
      ingredients: [{ name: "noodles" }, { name: "garlic" }],
      instructions: ["Mix together."]
    };
    const violates = checkRecipeViolatesAllergensOrDiet(recipe, ["peanut"], "Any");
    expect(violates).toBe(false);
  });

  it("should enforce Vegetarian dietary preference", () => {
    const meatRecipe = { title: "Chicken Rice", ingredients: [{ name: "chicken" }] };
    expect(checkRecipeViolatesAllergensOrDiet(meatRecipe, [], "Vegetarian")).toBe(true);

    const vegRecipe = { title: "Paneer Rice", ingredients: [{ name: "paneer" }] };
    expect(checkRecipeViolatesAllergensOrDiet(vegRecipe, [], "Vegetarian")).toBe(false);
  });

  it("should enforce Vegan dietary preference", () => {
    const dairyRecipe = { title: "Paneer Rice", ingredients: [{ name: "paneer" }] };
    expect(checkRecipeViolatesAllergensOrDiet(dairyRecipe, [], "Vegan")).toBe(true);

    const veganRecipe = { title: "Tofu Rice", ingredients: [{ name: "tofu" }] };
    expect(checkRecipeViolatesAllergensOrDiet(veganRecipe, [], "Vegan")).toBe(false);
  });
});
