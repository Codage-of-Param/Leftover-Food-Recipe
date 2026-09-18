import { z } from "zod";

// Zod schema for a single Recipe Ingredient
export const RecipeIngredientSchema = z.object({
  name: z.string(),
  quantity: z.string(),
  inPantry: z.boolean().optional(),
});

// Zod schema for a single Recipe
export const RecipeSchema = z.object({
  title: z.string().min(2),
  desc: z.string().optional(),
  description: z.string().optional(), // fallback
  score: z.number().min(0).max(100).optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  prep_time: z.number().optional(),
  cook_time: z.number().optional(),
  timeMinutes: z.number().optional(), // fallback
  servings: z.number().optional(),
  cals: z.number().optional(),
  protein: z.string().optional(),
  carbs: z.string().optional(),
  fat: z.string().optional(),
  fiber: z.string().optional(),
  sugar: z.string().optional(),
  sodium: z.string().optional(),
  isVeg: z.boolean().optional(),
  is_veg: z.boolean().optional(), // fallback
  eco_score: z.number().min(0).max(100).optional(),
  co2Saved: z.number().optional(),
  ingredients: z.array(RecipeIngredientSchema),
  ingredients_list: z.array(z.string()).optional(), // fallback
  instructions: z.array(z.string()),
});

// Zod schema for the expected AI Response (an array of recipes, or an object containing an array of recipes)
export const AIResponseSchema = z.array(RecipeSchema);

export const AILegacyResponseSchema = z.object({
  recipes: z.array(RecipeSchema)
});

/**
 * Extracts a JSON block from raw LLM text output.
 * Many LLMs wrap JSON in ```json ... ``` blocks or add conversational padding.
 */
export function extractJsonFromLlmOutput(rawText: string): string {
  let cleanText = rawText.trim();
  
  // Find the first [ or { and the last ] or } to strip conversation padding
  const firstCurly = cleanText.indexOf('{');
  const firstSquare = cleanText.indexOf('[');
  const lastCurly = cleanText.lastIndexOf('}');
  const lastSquare = cleanText.lastIndexOf(']');
  
  let firstIdx = -1;
  let lastIdx = -1;
  
  if (firstCurly !== -1 && firstSquare !== -1) {
    firstIdx = Math.min(firstCurly, firstSquare);
  } else if (firstCurly !== -1) {
    firstIdx = firstCurly;
  } else if (firstSquare !== -1) {
    firstIdx = firstSquare;
  }
  
  if (lastCurly !== -1 && lastSquare !== -1) {
    lastIdx = Math.max(lastCurly, lastSquare);
  } else if (lastCurly !== -1) {
    lastIdx = lastCurly;
  } else if (lastSquare !== -1) {
    lastIdx = lastSquare;
  }
  
  if (firstIdx !== -1 && lastIdx !== -1 && lastIdx >= firstIdx) {
    cleanText = cleanText.substring(firstIdx, lastIdx + 1);
  } else {
    // Fallback naive cleanup if regex approach fails
    if (cleanText.startsWith("```json")) cleanText = cleanText.replace("```json", "").trim();
    if (cleanText.startsWith("```")) cleanText = cleanText.replace("```", "").trim();
    if (cleanText.endsWith("```")) cleanText = cleanText.slice(0, -3).trim();
  }

  return cleanText;
}

/**
 * Parses and strictly validates the LLM response against our Zod schema.
 * Throws an error if validation fails.
 */
export function validateAiRecipeResponse(rawText: string): z.infer<typeof RecipeSchema>[] {
  const jsonStr = extractJsonFromLlmOutput(rawText);
  
  let parsedJson;
  try {
    parsedJson = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`Failed to parse LLM output as JSON. Output was: ${rawText.substring(0, 100)}...`);
  }

  // Handle both possible root shapes: array of recipes, or { recipes: [] }
  let targetArray;
  if (Array.isArray(parsedJson)) {
    targetArray = parsedJson;
  } else if (parsedJson && Array.isArray(parsedJson.recipes)) {
    targetArray = parsedJson.recipes;
  } else {
    throw new Error("Parsed JSON did not contain a valid array of recipes.");
  }

  // Validate the array shape
  const validationResult = AIResponseSchema.safeParse(targetArray);
  
  if (!validationResult.success) {
    console.error("Zod Validation Errors:", JSON.stringify(validationResult.error.format(), null, 2));
    throw new Error("LLM output failed strict schema validation: " + validationResult.error.message);
  }

  return validationResult.data;
}

// Re-exporting constraint logic from route.ts for testability
const ALLERGEN_KEYWORDS_MAP: Record<string, string[]> = {
  peanuts: ["peanut", "peanuts", "groundnut", "peanut butter", "peanut oil"],
  dairy: ["milk", "dairy", "cheese", "butter", "paneer", "cream", "yogurt", "curd", "ghee", "whey", "casein", "lactose", "parmesan", "mozzarella", "cheddar"],
  gluten: ["gluten", "wheat", "flour", "bread", "pasta", "maida", "barley", "rye", "semolina", "couscous"],
  sugar: ["sugar", "honey", "maple syrup", "corn syrup", "molasses", "sweetener", "cane sugar"],
  staples: [],
  eggs: ["egg", "eggs", "egg white", "egg yolk", "mayo", "mayonnaise"],
  treenuts: ["nut", "nuts", "almond", "almonds", "cashew", "cashews", "walnut", "walnuts", "pecan", "pistachio", "hazelnut", "macadamia", "pine nut"],
  shellfish: ["shellfish", "shrimp", "prawn", "crab", "lobster", "clam", "mussel", "oyster", "squid"],
  soy: ["soy", "soya", "tofu", "edamame", "tempeh", "soy sauce"],
};

export function getAllergenKeywords(allergies: string[]): string[] {
  const keywords: string[] = [];
  for (const allergy of allergies) {
    const clean = allergy.toLowerCase().trim();
    if (clean.includes(":")) {
      const [base, spec] = clean.split(":");
      if (ALLERGEN_KEYWORDS_MAP[base]) {
        keywords.push(...ALLERGEN_KEYWORDS_MAP[base]);
      } else {
        keywords.push(base);
      }
      if (spec) keywords.push(spec.trim());
    } else if (ALLERGEN_KEYWORDS_MAP[clean]) {
      keywords.push(...ALLERGEN_KEYWORDS_MAP[clean]);
    } else if (clean) {
      keywords.push(clean);
    }
  }
  return [...new Set(keywords.filter(Boolean))];
}

export function checkRecipeViolatesAllergensOrDiet(
  recipe: any,
  allergenKeywords: string[],
  dietPref: string
): boolean {
  const ingredients: string[] = Array.isArray(recipe.ingredients_list)
    ? recipe.ingredients_list
    : Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map((i: any) => (typeof i === "string" ? i : i.name || ""))
    : [];

  const allText = [
    recipe.title || "",
    recipe.description || recipe.desc || "",
    ...ingredients,
    ...(Array.isArray(recipe.instructions) ? recipe.instructions : [recipe.instructions || ""])
  ].join(" ").toLowerCase();

  // 1. Check Allergens
  for (const kw of allergenKeywords) {
    if (kw && allText.includes(kw.toLowerCase())) {
      return true; // Violates allergen!
    }
  }

  // 2. Check Dietary Preference
  const nonVegKeywords = ["chicken", "beef", "pork", "meat", "lamb", "mutton", "fish", "salmon", "tuna", "prawn", "shrimp", "seafood", "bacon", "turkey"];
  const nonVeganKeywords = [...nonVegKeywords, "milk", "cheese", "butter", "paneer", "cream", "yogurt", "curd", "ghee", "egg", "eggs", "honey"];

  if (dietPref === "Vegetarian") {
    if (recipe.isVeg === false || recipe.is_veg === false) return true;
    for (const kw of nonVegKeywords) {
      if (allText.includes(kw)) return true;
    }
  } else if (dietPref === "Vegan") {
    if (recipe.isVeg === false || recipe.is_veg === false) return true;
    for (const kw of nonVeganKeywords) {
      if (allText.includes(kw)) return true;
    }
  }

  return false;
}
