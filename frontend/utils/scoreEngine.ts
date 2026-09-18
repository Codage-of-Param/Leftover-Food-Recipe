/**
 * Mathematical model for calculating a "Rescue Score" (0-100).
 * High score = heavily relies on user's expiring/pantry ingredients with minimal new additions.
 * Low score = requires buying many new ingredients.
 */
export function calculateRescueScore(
  recipeIngredients: { name: string; inPantry?: boolean }[],
  pantryCount: number = 0
): number {
  if (!recipeIngredients || recipeIngredients.length === 0) return 0;

  let pantryMatches = 0;
  
  recipeIngredients.forEach(ingredient => {
    // If the ingredient is explicitly marked as inPantry, or we have matches
    if (ingredient.inPantry) {
      pantryMatches++;
    }
  });

  const totalIngredients = recipeIngredients.length;
  
  // Base ratio: What percentage of the recipe comes from the pantry?
  const ratio = pantryMatches / totalIngredients;
  
  // Rescue Score is heavily weighted toward the ratio, scaled 0-100
  let score = Math.round(ratio * 100);

  // Bonus points: if they used a high absolute number of pantry items (rescuing more food)
  if (pantryMatches >= 3) {
    score += 5;
  }
  
  // Penalty: if the recipe demands more than 5 net-new ingredients, reduce score (less zero-waste)
  const missingIngredients = totalIngredients - pantryMatches;
  if (missingIngredients >= 5) {
    score -= 10;
  }

  // Bound between 0 and 100
  return Math.max(0, Math.min(100, score));
}
