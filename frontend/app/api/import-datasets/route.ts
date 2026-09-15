import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET = "Dataset LOFR";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let inBracket = 0;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "[") inBracket++;
    if (ch === "]") inBracket--;
    if (ch === '"' && inBracket === 0) {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes && inBracket === 0) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseIngredientList(raw: string): string[] {
  // Handles formats like: [carrot, tomato, onion] or ['carrot', 'tomato']
  let cleaned = raw.trim();
  if (cleaned.startsWith("[")) cleaned = cleaned.slice(1);
  if (cleaned.endsWith("]")) cleaned = cleaned.slice(0, -1);
  return cleaned
    .split(",")
    .map(s => s.trim().replace(/^['"]|['"]$/g, ""))
    .filter(s => s.length > 0);
}

function parseNutrition(raw: string): {
  calories: number; fat: number; sugar: number; sodium: number;
  protein: number; saturated_fat: number; carbs: number;
} {
  // Food_Recipes.csv nutrition format: [calories, fat, sugar, sodium, protein, saturated_fat, carbs]
  try {
    let cleaned = raw.trim();
    if (cleaned.startsWith("[")) cleaned = cleaned.slice(1);
    if (cleaned.endsWith("]")) cleaned = cleaned.slice(0, -1);
    const nums = cleaned.split(",").map(s => parseFloat(s.trim()) || 0);
    return {
      calories: nums[0] || 0,
      fat: nums[1] || 0,
      sugar: nums[2] || 0,
      sodium: nums[3] || 0,
      protein: nums[4] || 0,
      saturated_fat: nums[5] || 0,
      carbs: nums[6] || 0,
    };
  } catch {
    return { calories: 0, fat: 0, sugar: 0, sodium: 0, protein: 0, saturated_fat: 0, carbs: 0 };
  }
}

function parseStepsList(raw: string): string[] {
  let cleaned = raw.trim();
  if (cleaned.startsWith("[")) cleaned = cleaned.slice(1);
  if (cleaned.endsWith("]")) cleaned = cleaned.slice(0, -1);
  // Steps are often quoted strings separated by commas
  return cleaned
    .split(/','|","|', '|", "/)
    .map(s => s.trim().replace(/^['"]|['"]$/g, ""))
    .filter(s => s.length > 5);
}

export async function POST() {
  if (!SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }, { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const results: Record<string, any> = {};

  try {
    // ========= 1. Import Food_Recipes.csv =========
    const { data: frData, error: frErr } = await supabase.storage
      .from(BUCKET)
      .download("Food_Recipes.csv");

    if (frErr || !frData) {
      results.food_recipes = { error: frErr?.message || "Download failed" };
    } else {
      const text = await frData.text();
      const lines = text.split("\n").filter(l => l.trim());
      // Headers: name, id, minutes, contributor_id, submitted, tags, nutrition, n_steps, steps, description, ingredients, n_ingredients
      const header = parseCSVLine(lines[0]);
      const nameIdx = header.indexOf("name");
      const minutesIdx = header.indexOf("minutes");
      const nutritionIdx = header.indexOf("nutrition");
      const stepsIdx = header.indexOf("steps");
      const descIdx = header.indexOf("description");
      const ingredientsIdx = header.indexOf("ingredients");
      const nIngredientsIdx = header.indexOf("n_ingredients");

      let importedCount = 0;
      const batchSize = 200;
      let recipeBatch: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const recipeName = (cols[nameIdx] || "").replace(/^['"]|['"]$/g, "").trim();
        if (!recipeName || recipeName.length < 2) continue;

        const minutes = parseInt(cols[minutesIdx]) || 30;
        const nutrition = parseNutrition(cols[nutritionIdx] || "[]");
        const steps = parseStepsList(cols[stepsIdx] || "[]");
        const description = (cols[descIdx] || "").replace(/^['"]|['"]$/g, "").trim();
        const ingredientsList = parseIngredientList(cols[ingredientsIdx] || "[]");

        recipeBatch.push({
          title: recipeName,
          source: "Food_Recipes.csv",
          source_id: String(i),
          cuisine: "International",
          category: "General",
          cook_time_minutes: minutes,
          servings: 2,
          instructions: steps.length > 0 ? steps.join("\n") : "Follow standard preparation.",
          description: description || null,
          ingredients_list: ingredientsList,
          calories: nutrition.calories,
          protein_g: nutrition.protein,
          carbs_g: nutrition.carbs,
          fat_g: nutrition.fat,
          fiber_g: 0,
          sugar_g: nutrition.sugar,
          sodium_mg: nutrition.sodium,
        });

        if (recipeBatch.length >= batchSize) {
          await insertRecipeBatch(supabase, recipeBatch);
          importedCount += recipeBatch.length;
          recipeBatch = [];
        }
      }
      if (recipeBatch.length > 0) {
        await insertRecipeBatch(supabase, recipeBatch);
        importedCount += recipeBatch.length;
      }
      results.food_recipes = { imported: importedCount };
    }

    // ========= 2. Import INDORI.csv =========
    const { data: indData, error: indErr } = await supabase.storage
      .from(BUCKET)
      .download("INDORI.csv");

    if (indErr || !indData) {
      results.indori = { error: indErr?.message || "Download failed" };
    } else {
      const text = await indData.text();
      const lines = text.split("\n").filter(l => l.trim());
      // Headers: recipe_name, ingredients, cuisine, category, preparation_time, cooking_instructions
      const header = parseCSVLine(lines[0]);
      const nameIdx = header.indexOf("recipe_name");
      const ingredientsIdx = header.indexOf("ingredients");
      const cuisineIdx = header.indexOf("cuisine");
      const categoryIdx = header.indexOf("category");
      const prepTimeIdx = header.indexOf("preparation_time");
      const instructionsIdx = header.indexOf("cooking_instructions");

      let importedCount = 0;
      const batchSize = 200;
      let recipeBatch: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const recipeName = (cols[nameIdx] || "").replace(/^['"]|['"]$/g, "").trim();
        if (!recipeName || recipeName.length < 2) continue;

        const ingredientsList = parseIngredientList(cols[ingredientsIdx] || "[]");
        const cuisine = (cols[cuisineIdx] || "Indian").replace(/^['"]|['"]$/g, "").trim();
        const category = (cols[categoryIdx] || "").replace(/^['"]|['"]$/g, "").trim();
        const prepTime = parseInt(cols[prepTimeIdx]) || 30;
        const instructions = (cols[instructionsIdx] || "").replace(/^['"]|['"]$/g, "").trim();

        recipeBatch.push({
          title: recipeName,
          source: "INDORI.csv",
          source_id: String(i),
          cuisine,
          category: category || "General",
          cook_time_minutes: prepTime,
          servings: 2,
          instructions: instructions || "Follow standard preparation.",
          description: null,
          ingredients_list: ingredientsList,
          calories: 0,
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
          fiber_g: 0,
          sugar_g: 0,
          sodium_mg: 0,
        });

        if (recipeBatch.length >= batchSize) {
          await insertRecipeBatch(supabase, recipeBatch);
          importedCount += recipeBatch.length;
          recipeBatch = [];
        }
      }
      if (recipeBatch.length > 0) {
        await insertRecipeBatch(supabase, recipeBatch);
        importedCount += recipeBatch.length;
      }
      results.indori = { imported: importedCount };
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error("Dataset import error:", err);
    return NextResponse.json({ error: err?.message || "Import failed" }, { status: 500 });
  }
}

async function insertRecipeBatch(supabase: any, batch: any[]) {
  // Insert into recipes table, then insert ingredient links
  for (const recipe of batch) {
    const { ingredients_list, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, description, ...recipeData } = recipe;

    const { data: inserted, error: insertErr } = await supabase
      .from("recipes")
      .insert([recipeData])
      .select("id")
      .single();

    if (insertErr || !inserted) {
      console.warn(`Failed to insert recipe "${recipeData.title}":`, insertErr?.message);
      continue;
    }

    const recipeId = inserted.id;

    // Insert ingredients
    if (ingredients_list && ingredients_list.length > 0) {
      const ingredientRows = ingredients_list.map((name: string) => ({
        recipe_id: recipeId,
        raw_ingredient_text: name.toLowerCase().trim(),
        is_required: true,
      }));

      const { error: ingErr } = await supabase
        .from("recipe_ingredients")
        .insert(ingredientRows);

      if (ingErr) {
        console.warn(`Failed to insert ingredients for "${recipeData.title}":`, ingErr.message);
      }
    }

    // Insert nutrition data if available
    if (calories > 0 || protein_g > 0) {
      await supabase.from("nutrition_data").insert([{
        food_description: recipeData.title,
        calories,
        protein_g,
        carbs_g,
        fat_g,
        fiber_g,
        source: recipe.source || "csv",
      }]);
    }
  }
}
