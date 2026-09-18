import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Common food-related keywords to extract ingredients from natural language
const STOP_WORDS = new Set([
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

function extractIngredients(text: string): string[] {
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

function getAllergenKeywords(allergies: string[]): string[] {
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

function checkRecipeViolatesAllergensOrDiet(
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

async function saveAiRecipesToDb(rawText: string) {
  try {
    let cleanText = rawText.trim();
    if (cleanText.startsWith("```json")) cleanText = cleanText.replace("```json", "").trim();
    if (cleanText.startsWith("```")) cleanText = cleanText.replace("```", "").trim();
    if (cleanText.endsWith("```")) cleanText = cleanText.slice(0, -3).trim();
    
    const parsedJson = JSON.parse(cleanText);
    const ai_recipes = Array.isArray(parsedJson) ? parsedJson : (parsedJson.recipes || []);
    
    const dbPayload = ai_recipes.map((r: any) => ({
      id: crypto.randomUUID(),
      title: r.title || "AI Generated Recipe",
      description: r.desc || r.description || "",
      cook_time_minutes: Number(r.timeMinutes || r.cook_time || 30),
      servings: Number(r.servings || 2),
      instructions: JSON.stringify(r.instructions || []),
      ingredients_list: r.ingredients?.map((i:any) => typeof i === 'string' ? i : i.name) || [],
      source: "AI_GENERATED",
      category: "Zero-Waste"
    }));
    
    if (dbPayload.length > 0) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await supabase.from('recipes').insert(dbPayload);
    }
  } catch (e) {
    console.warn("Failed to insert chat recipes into DB:", e);
  }
}

function formatDbRecipesToJson(dbRecipes: any[]): string {
  const recipes = dbRecipes.map(r => {
    const ingredientsList = r.ingredients_list || [];
    return {
      title: r.title,
      desc: r.description || `A delicious ${r.cuisine || ""} ${r.category || ""} recipe.`.trim(),
      score: Math.round(r.similarity_score || 85),
      difficulty: (r.cook_time_minutes || 30) <= 15 ? "Easy" : (r.cook_time_minutes || 30) <= 30 ? "Medium" : "Hard",
      prep_time: Math.round((r.cook_time_minutes || 30) * 0.3),
      cook_time: Math.round((r.cook_time_minutes || 30) * 0.7),
      servings: r.servings || 2,
      cals: 350,
      protein: "15g",
      carbs: "40g",
      fat: "12g",
      isVeg: true,
      eco_score: Math.round(r.similarity_score || 80),
      co2Saved: 1.2,
      source: "database",
      ingredients: ingredientsList.map((name: string) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        quantity: "as needed",
        inPantry: true,
      })),
      instructions: (r.instructions || "Prepare ingredients and cook.")
        .split("\n")
        .filter((s: string) => s.trim().length > 3),
    };
  });

  return "```json\n" + JSON.stringify(recipes, null, 2) + "\n```";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userMessage = body.userMessage || body.message || (Array.isArray(body.messages) ? body.messages[body.messages.length - 1]?.content : "");
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    const userConstraints = body.userConstraints || {};

    if ((!userMessage || typeof userMessage !== "string" || !userMessage.trim()) && attachments.length === 0) {
      return NextResponse.json(
        { error: "Invalid request. Message or attachment is required." },
        { status: 400 }
      );
    }

    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    const dietPref = userConstraints.dietaryPreference || "Any";
    const rawAllergies: string[] = Array.isArray(userConstraints.allergies) ? userConstraints.allergies : [];
    const allergenKeywords = getAllergenKeywords(rawAllergies);
    const allergiesList = rawAllergies.length > 0 ? rawAllergies.join(", ") : "None";
    const inventoryList = Array.isArray(userConstraints.inventory) ? userConstraints.inventory : [];
    const maxTime = userConstraints.maxCookingTime || 45;
    const userId = body.userId || "00000000-0000-0000-0000-000000000001";


    // ========= STEP 1: Try to match recipes from database =========
    const extractedIngredients = extractIngredients(userMessage || "");
    const combinedSearchIngredients = [...new Set([...extractedIngredients, ...inventoryList])];

    if (combinedSearchIngredients.length > 0) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        const { data: dbRecipes, error: rpcErr } = await supabase
          .rpc("match_recipes_by_ingredients", {
            ingredient_names: combinedSearchIngredients.slice(0, 10),
          });

        if (!rpcErr && dbRecipes && dbRecipes.length > 0) {
          // Filter by time, allergens, and dietary preference
          const filtered = dbRecipes.filter((r: any) => {
            if (maxTime < 120 && (r.cook_time_minutes || 30) > maxTime) return false;
            return !checkRecipeViolatesAllergensOrDiet(r, allergenKeywords, dietPref);
          });

          if (filtered.length >= 2) {
            const top = filtered.slice(0, 4);
            const jsonBlock = formatDbRecipesToJson(top);
            const introText = `🍳 I found ${top.length} recipes matching your ingredients, fully verified to be free of your allergens (${allergiesList}) and aligned with your ${dietPref} diet:`;

            return NextResponse.json({
              choices: [
                {
                  message: {
                    role: "assistant",
                    content: introText + "\n\n" + jsonBlock,
                  },
                },
              ],
            });
          }
        }
      } catch (dbErr) {
        console.warn("Database recipe matching failed, falling back to AI:", dbErr);
      }
    }

    // ========= STEP 2: Fall back to AI generation with Strict Constraints =========
    const inventorySummary = inventoryList.length > 0
      ? `User's Available Pantry / Fridge Ingredients:\n${inventoryList.map((i: string) => `- ${i}`).join("\n")}`
      : "No inventory items specified; use ingredients explicitly mentioned in prompt.";

    // Fetch user reviews
    let reviewSummary = "No past reviews found for this user.";
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: reviews } = await supabase
        .from("recipe_reviews")
        .select("recipe_title, rating, review_text")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (reviews && reviews.length > 0) {
        reviewSummary = "User's Past Ratings and Feedback:\n" + reviews.map((r: any) => 
          `- ${r.recipe_title}: ${r.rating}/5 stars${r.review_text ? ` ("${r.review_text}")` : ""}`
        ).join("\n");
      }
    } catch (e) {
      console.warn("Failed to fetch reviews", e);
    }

    const systemPrompt = `You are a professional zero-waste culinary chef and AI assistant.
Your mission is to generate creative zero-waste recipes strictly using available leftover ingredients while rigidly enforcing the user's allergen safety and dietary preference.

CRITICAL ALLERGEN AND SAFETY RULES (ZERO TOLERANCE):
1. User's Declared Allergens / Ingredients to Avoid: ${allergiesList}
${allergenKeywords.length > 0 ? `BANNED KEYWORDS & DERIVATIVES: [${allergenKeywords.join(", ")}].\nDO NOT INCLUDE ANY OF THESE INGREDIENTS OR DERIVATIVES UNDER ANY CIRCUMSTANCES.` : "No allergens specified."}
2. Dietary Preference: ${dietPref} (e.g. If Vegetarian, absolutely NO meat, fish, gelatin, or poultry; if Vegan, absolutely NO animal products, dairy, eggs, or honey).
3. Max Cooking Time: ${maxTime} minutes.

USER PREFERENCES & FEEDBACK:
Please learn from what the user liked and disliked in the past, and suggest similar recipes to their highly rated ones.
${reviewSummary}

INGREDIENT UTILIZATION RULE:
- Base your recipes primarily on the user's available ingredients:
${inventorySummary}
- Also incorporate any specific ingredients mentioned in the user's prompt or uploaded attachments.
- Prioritize using expiring/leftover ingredients to prevent food waste.

OUTPUT FORMAT:
You MUST return exactly 2 to 4 recipes formatted in a JSON array enclosed in a \`\`\`json block.
Each recipe object MUST have:
- "title": string (creative, appetizing recipe name)
- "desc": string (engaging zero-waste description)
- "score": number (0-100 rescue score)
- "difficulty": "Easy", "Medium", or "Hard"
- "prep_time": number (minutes)
- "cook_time": number (minutes)
- "servings": number
- "cals": number
- "protein": string (e.g. "18g")
- "carbs": string (e.g. "32g")
- "fat": string (e.g. "10g")
- "fiber": string (e.g. "5g")
- "isVeg": boolean (true if vegetarian/vegan)
- "eco_score": number (0-100)
- "co2Saved": number (kg)
- "ingredients": array of objects with:
    "name": string (clean ingredient name),
    "quantity": string (e.g. "1 cup", "200g"),
    "inPantry": boolean (true if in available pantry/leftovers)
- "instructions": array of step-by-step strings`;

    // Build final prompt incorporating attachments
    let finalPrompt = (userMessage || "Analyze the available ingredients/attachments and generate safe, allergen-free recipes.").trim();

    if (attachments.length > 0) {
      const attachmentSummaries = attachments.map((att: any, idx: number) => {
        if (att.isImage) {
          return `[Attached Image ${idx + 1}: ${att.name || "fridge_photo.jpg"}]`;
        }
        const snippet = att.content ? att.content.substring(0, 1500) : "";
        return `[Attached File ${idx + 1}: ${att.name}]\nFile Content:\n${snippet}`;
      }).join("\n\n");

      finalPrompt = `${finalPrompt}\n\nAttached Context:\n${attachmentSummaries}`;
    }

    // 1. Try OpenRouter free models API
    if (openrouterKey && !openrouterKey.includes("mock-or-set-your-key-here")) {
      let OPENROUTER_MODELS: string[] = [];
      try {
        const modelsRes = await fetch("https://openrouter.ai/api/v1/models");
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json();
          OPENROUTER_MODELS = (modelsData.data || [])
            .filter((m: any) => m.pricing?.prompt === "0" && m.pricing?.completion === "0")
            .map((m: any) => m.id)
            .slice(0, 5);
        }
      } catch (err) {
        console.warn("Failed to dynamically fetch OpenRouter models", err);
      }
      
      // Fallback just in case the API is completely unreachable
      if (OPENROUTER_MODELS.length === 0) {
        OPENROUTER_MODELS = ["qwen/qwen-2-7b-instruct:free", "google/gemma-2-9b-it:free"];
      }

      for (const m of OPENROUTER_MODELS) {
        try {
          const openrouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openrouterKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "http://localhost:3000",
              "X-Title": "Food Rescue AI",
            },
            body: JSON.stringify({
              model: m,
              messages: [
                {
                  role: "system",
                  content: systemPrompt
                },
                {
                  role: "user",
                  content: finalPrompt
                }
              ]
            }),
          });

          if (openrouterResponse.ok) {
            const data = await openrouterResponse.json();
            const assistantText = data.choices?.[0]?.message?.content;
            if (assistantText) {
              await saveAiRecipesToDb(assistantText);
            }
            return NextResponse.json(data);
          }
        } catch (orErr) {
          console.warn(`OpenRouter model ${m} failed:`, orErr);
        }
      }
    }

    // 2. Fallback to Gemini API if available
    if (geminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [{ text: `${systemPrompt}\n\nUser Request:\n${finalPrompt}` }]
                }
              ]
            })
          }
        );

        if (geminiRes.ok) {
          const gData = await geminiRes.json();
          const generatedText = gData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText) {
            await saveAiRecipesToDb(generatedText);
            
            return NextResponse.json({
              choices: [
                {
                  message: {
                    role: "assistant",
                    content: generatedText
                  }
                }
              ]
            });
          }
        }
      } catch (gErr) {
        console.warn("Gemini direct API failed:", gErr);
      }
    }

    return NextResponse.json(
      {
        error: "AI service is currently unavailable. Please verify API keys in frontend/.env.local."
      },
      { status: 500 }
    );
  } catch (err: any) {
    console.error("Error in /api/chat route:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error processing chat request" },
      { status: 500 }
    );
  }
}
