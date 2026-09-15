import { ChatRecipeData } from "@/components/RecipeChatCard";

export function parseRecipeFromMessage(text: string): ChatRecipeData[] | null {
  if (!text || typeof text !== "string") return null;

  // 1. Check for JSON block
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (jsonMatch) {
    try {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      let recipesArray: any[] = [];
      
      if (Array.isArray(parsed)) {
        recipesArray = parsed;
      } else if (parsed.recipes && Array.isArray(parsed.recipes)) {
        recipesArray = parsed.recipes;
      } else if (parsed.recipe) {
        recipesArray = [parsed.recipe];
      } else {
        recipesArray = [parsed];
      }

      const validRecipes = recipesArray.filter(r => r && r.title && Array.isArray(r.ingredients));
      if (validRecipes.length > 0) {
        return validRecipes.map(recipeObj => ({
          title: recipeObj.title,
          desc: recipeObj.desc || recipeObj.description,
          score: recipeObj.score || 95,
          difficulty: recipeObj.difficulty || "Easy",
          prep_time: recipeObj.prep_time || 10,
          cook_time: recipeObj.cook_time || 10,
          timeMinutes: recipeObj.timeMinutes || (recipeObj.prep_time || 0) + (recipeObj.cook_time || 0) || 20,
          cals: recipeObj.cals || recipeObj.calories || 380,
          protein: recipeObj.protein || "0g",
          carbs: recipeObj.carbs || "0g",
          fat: recipeObj.fat || "0g",
          fiber: recipeObj.fiber || "0g",
          sugar: recipeObj.sugar || "0g",
          sodium: recipeObj.sodium || "0mg",
          servings: recipeObj.servings || 2,
          isVeg: recipeObj.isVeg !== undefined ? recipeObj.isVeg : true,
          eco_score: recipeObj.eco_score || 85,
          co2Saved: recipeObj.co2Saved || recipeObj.co2_saved || 1.5,
          ingredients: recipeObj.ingredients.map((ing: any) =>
            typeof ing === "string" ? { name: ing, inPantry: true } : { name: ing.name, quantity: ing.quantity, inPantry: ing.inPantry !== undefined ? ing.inPantry : true }
          ),
          instructions: Array.isArray(recipeObj.instructions) ? recipeObj.instructions : []
        }));
      }
    } catch (e) {
      console.warn("JSON parsing failed in recipe parser", e);
    }
  }

  // 2. Fallback: Parse markdown text for Recipe Title, Ingredients, and Instructions
  const titleMatch = text.match(/^(?:#|\*\*|Recipe:?\s*)([^\n]+)/m) || text.match(/Title:?\s*([^\n]+)/i);
  if (!titleMatch) return null;

  const title = titleMatch[1].replace(/[*#]/g, "").trim();
  if (!title || title.length < 3 || title.toLowerCase().includes("hello") || title.toLowerCase().includes("how can i help")) {
    return null;
  }

  // Extract ingredients
  const ingredients: Array<{ name: string; quantity?: string; inPantry?: boolean }> = [];
  const ingSection = text.match(/(?:Ingredients|Items|Pantry Stock):?\s*([\s\S]*?)(?=\n\s*(?:Instructions|Steps|Directions|Preparation)|$)/i);
  if (ingSection) {
    const lines = ingSection[1].split("\n");
    for (const line of lines) {
      const cleaned = line.replace(/^[-*•\d.\s]+/, "").trim();
      if (cleaned) {
        const qtyMatch = cleaned.match(/(.*?)\((.*?)\)/);
        if (qtyMatch) {
          ingredients.push({ name: qtyMatch[1].trim(), quantity: qtyMatch[2].trim(), inPantry: true });
        } else {
          ingredients.push({ name: cleaned, inPantry: true });
        }
      }
    }
  }

  // Extract instructions
  const instructions: string[] = [];
  const instSection = text.match(/(?:Instructions|Steps|Directions|Preparation):?\s*([\s\S]*?)$/i);
  if (instSection) {
    const lines = instSection[1].split("\n");
    for (const line of lines) {
      const cleaned = line.replace(/^[-*•\d.\s]+/, "").trim();
      if (cleaned && cleaned.length > 5) {
        instructions.push(cleaned);
      }
    }
  }

  if (ingredients.length === 0 && instructions.length === 0) {
    return null;
  }

  return [{
    title,
    desc: text.substring(0, 150).replace(/[*#]/g, "").trim(),
    score: 95,
    difficulty: "Medium",
    prep_time: 10,
    cook_time: 10,
    timeMinutes: 20,
    cals: 380,
    servings: 2,
    isVeg: true,
    eco_score: 90,
    co2Saved: 1.0,
    ingredients,
    instructions
  }];
}
