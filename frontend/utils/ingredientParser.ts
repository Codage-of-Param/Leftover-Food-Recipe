// Common food-related keywords to extract ingredients from natural language
export const STOP_WORDS = new Set([
  "recipe", "recipes", "make", "cook", "prepare", "with", "using", "from",
  "my", "the", "a", "an", "and", "or", "for", "me", "some", "quick",
  "easy", "simple", "delicious", "healthy", "tasty", "best", "good",
  "leftover", "leftovers", "available", "ingredients", "ingredient",
  "food", "dish", "meal", "dinner", "lunch", "breakfast", "snack",
  "please", "can", "you", "i", "have", "got", "want", "need",
  "something", "anything", "give", "show", "suggest", "generate",
  "create", "zero", "waste", "zero-waste", "creative", "scanned",
  "fridge", "pantry", "these", "those", "what", "how", "which",
  "min", "minute", "minutes", "fast", "under",
]);

/**
 * Normalizes a natural language prompt and extracts raw ingredients.
 */
export function extractIngredients(text: string): string[] {
  if (!text) return [];
  
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Split on commas or "and"
  const parts = cleaned.split(/,|\band\b/).map(s => s.trim()).filter(Boolean);

  const ingredients: string[] = [];
  for (const part of parts) {
    const words = part.split(/\s+/).filter(w => !STOP_WORDS.has(w) && w.length > 1);
    if (words.length > 0) {
      ingredients.push(words.join(" "));
    }
  }
  return [...new Set(ingredients)];
}
