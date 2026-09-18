from fastapi import APIRouter, HTTPException
import os
import json
import uuid
import logging
import requests
import urllib.parse
import ast
from typing import List
from ..schemas.api_models import GenerationRequest, GenerationResponse, RecipeRecommendation

logger = logging.getLogger("recipe_generator")
router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://syzsktdvuswyobosmlyy.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5enNrdGR2dXN3eW9ib3NtbHl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDIxMzkyNCwiZXhwIjoyMDk5Nzg5OTI0fQ.N2sksMRTvvAM67OgBiGoQ3TH0d7J5eaj66H2_yxob1o")

def fetch_db_recipes(inventory_names: List[str]) -> List[dict]:
    if not inventory_names:
        return []
    
    # Format array for overlap operator: {"item1","item2"}
    items_str = ",".join([f'"{name}"' for name in inventory_names])
    query = f'ingredients_list=ov.{{{items_str}}}&limit=20'
    url = f"{SUPABASE_URL}/rest/v1/recipes?select=*&{urllib.parse.quote_plus(query, safe='=&{}')}"
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            logger.error(f"Supabase fetch error: {response.text}")
            return []
        
        recipes = response.json()
        
        candidates = []
        inventory_lower = [name.lower() for name in inventory_names]
        
        for r in recipes:
            recipe_ing_list = r.get('ingredients_list', [])
            if isinstance(recipe_ing_list, str):
                try:
                    recipe_ing_list = ast.literal_eval(recipe_ing_list)
                except:
                    recipe_ing_list = [recipe_ing_list]
                    
            missing = []
            for ing in recipe_ing_list:
                found = False
                for inv in inventory_lower:
                    if inv in ing.lower() or ing.lower() in inv:
                        found = True
                        break
                if not found:
                    missing.append(ing)
            
            # Format to RecipeRecommendation schema
            formatted = {
                "id": str(r.get("id", uuid.uuid4())),
                "title": str(r.get("title", "Untitled Recipe")),
                "desc": str(r.get("description", r.get("category", "A delicious database recipe."))),
                "score": 90 if len(missing) == 0 else 75,
                "wasteSaved": 1.0,
                "co2Saved": 2.0,
                "timeMinutes": int(r.get("cook_time_minutes", 30) or 30),
                "servings": int(r.get("servings", 2) or 2),
                "cals": 400,
                "protein": "15g",
                "isVeg": True,  # Assume true or parse from category
                "isBuyOneOrTwo": len(missing) > 0,
                "missingIngredients": missing,
                "ingredients": [
                    {
                        "name": ing,
                        "quantity": "As needed",
                        "inPantry": ing not in missing,
                        "isUrgent": False,
                        "substitution": None
                    } for ing in recipe_ing_list
                ],
                "instructions": []
            }
            
            # handle instructions
            raw_inst = r.get("instructions", "")
            if isinstance(raw_inst, str):
                try:
                    inst_list = ast.literal_eval(raw_inst)
                    if isinstance(inst_list, list):
                        formatted["instructions"] = [str(i) for i in inst_list]
                    else:
                        formatted["instructions"] = [raw_inst]
                except:
                    formatted["instructions"] = [raw_inst]
            elif isinstance(raw_inst, list):
                formatted["instructions"] = [str(i) for i in raw_inst]
            else:
                formatted["instructions"] = ["Cook according to preference."]
                
            candidates.append({
                "recipe": formatted,
                "missing_count": len(missing)
            })
        
        # Sort by fewest missing
        candidates.sort(key=lambda x: x['missing_count'])
        # Return top 2
        return [c['recipe'] for c in candidates[:2]]
    except Exception as e:
        logger.error(f"Error fetching from DB: {e}")
        return []

@router.post("/generate", response_model=GenerationResponse)
async def generate_recipes(req: GenerationRequest):
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key or "dd7896" in api_key: # Force reload if it's the old bad key
        from dotenv import load_dotenv
        load_dotenv(override=True)
        api_key = os.getenv("OPENROUTER_API_KEY")

    if not api_key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY is not configured in backend/.env file.")

    inventory_names = [item.get('ingredient_name', 'Unknown') for item in req.inventory]
    
    # 1. Fetch from Database first
    db_recipes = fetch_db_recipes(inventory_names)
    
    remaining_count = 3 - len(db_recipes)
    all_recipes = list(db_recipes)
    
    # 2. Generate remaining from AI
    if remaining_count > 0:
        inventory_str = "\n".join([f"- {item.get('ingredient_name', 'Unknown')} (Quantity: {item.get('quantity', 'N/A')}, Urgent: {item.get('is_urgent', False)})" for item in req.inventory])
        allergies_str = ", ".join(req.allergies) if req.allergies else "None"
        
        prompt = f"""
        You are a zero-waste culinary expert. Given the following user's pantry inventory, their dietary preferences, allergies, and maximum cooking time, generate exactly {remaining_count} creative, delicious recipes.
        
        CRITICAL USER SAFETY & ALLERGEN RULES:
        - User Allergies to Avoid (ZERO TOLERANCE): {allergies_str} (NEVER use or suggest any of these ingredients or their derivatives anywhere in any recipe, ingredients list, or instructions)
        - Dietary Preference: {req.preferences} (Must strictly comply with this diet, e.g. Vegetarian/Vegan)
        - Max Cooking Time: {req.maxCookingTime} minutes
        
        Inventory:
        {inventory_str}
        
        You must return a raw JSON object (with NO markdown formatting like ```json) that matches this exact schema structure:
        {{
            "recipes": [
                {{
                    "id": "uuid-string",
                    "title": "String",
                    "desc": "String (Short appetizing description)",
                    "score": 100, (Number out of 100 representing how well it uses urgent ingredients)
                    "wasteSaved": 2.5, (Number in kg)
                    "co2Saved": 5.0, (Number in kg)
                    "timeMinutes": 30, (Number)
                    "servings": 2, (Number)
                    "cals": 450, (Number)
                    "protein": "25g", (String)
                    "isVeg": true, (Boolean)
                    "isBuyOneOrTwo": false, (Boolean, true if it requires missing ingredients)
                    "missingIngredients": ["List of strings", "Optional"],
                    "ingredients": [
                        {{
                            "name": "String",
                            "quantity": "String",
                            "inPantry": true, (Boolean)
                            "isUrgent": false, (Boolean)
                            "substitution": null (String or null)
                        }}
                    ],
                    "instructions": [
                        "Step 1...",
                        "Step 2..."
                    ]
                }}
            ]
        }}
        
        Make sure your JSON is valid and strictly follows the structure. DO NOT wrap it in ```json code blocks.
        """
    
        try:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Leftover Food Recipe App"
            }
            
            # Dynamically fetch free OpenRouter models
            free_models = []
            try:
                models_res = requests.get("https://openrouter.ai/api/v1/models", timeout=5)
                if models_res.status_code == 200:
                    data = models_res.json()
                    free_models = [
                        m['id'] for m in data.get('data', [])
                        if m.get('pricing', {}).get('prompt') == '0' and m.get('pricing', {}).get('completion') == '0'
                    ][:5]
            except Exception as e:
                logger.warning(f"Failed to dynamically fetch OpenRouter models: {e}")
            
            # Fallback
            if not free_models:
                free_models = ["qwen/qwen-2-7b-instruct:free", "google/gemma-2-9b-it:free"]
            
            response = None
            response_data = None
            used_model = None
            
            for model_slug in free_models:
                payload = {
                    "model": model_slug,
                    "response_format": { "type": "json_object" },
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a helpful zero-waste culinary expert. Always return JSON matching the requested schema. DO NOT output any markdown blocks, only the raw JSON string."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                }
                
                logger.info(f"Trying OpenRouter free model: {model_slug}")
                res = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
                
                if res.status_code == 200:
                    response = res
                    response_data = res.json()
                    used_model = model_slug
                    break
                else:
                    logger.warning(f"Model {model_slug} failed: {res.text}")
                    
            if not response:
                raise Exception("All free OpenRouter endpoints are currently busy or unavailable. Please try again in a few minutes.")
                
            raw_text = response_data['choices'][0]['message']['content']
            
            # Clean up the response in case OpenRouter's model still wrapped it in markdown
            if raw_text.startswith("```json"):
                raw_text = raw_text.replace("```json", "", 1)
            if raw_text.startswith("```"):
                raw_text = raw_text.replace("```", "", 1)
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            
            parsed_json = json.loads(raw_text.strip())
            
            ai_recipes = parsed_json.get("recipes", [])
            db_insert_payload = []
            for r in ai_recipes:
                if not r.get("id"):
                    r["id"] = str(uuid.uuid4())
                    
                # Prepare for DB insertion
                db_recipe = {
                    "id": r["id"],
                    "title": r.get("title", "AI Generated Recipe"),
                    "description": r.get("desc", ""),
                    "cook_time_minutes": int(r.get("timeMinutes", 30)),
                    "servings": int(r.get("servings", 2)),
                    "instructions": json.dumps(r.get("instructions", [])),
                    "ingredients_list": [i.get("name") for i in r.get("ingredients", [])],
                    "source": "AI_GENERATED",
                    "category": "Zero-Waste"
                }
                db_insert_payload.append(db_recipe)
                
            if db_insert_payload:
                try:
                    supa_headers = {
                        "apikey": SUPABASE_KEY,
                        "Authorization": f"Bearer {SUPABASE_KEY}",
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal"
                    }
                    requests.post(f"{SUPABASE_URL}/rest/v1/recipes", headers=supa_headers, json=db_insert_payload, timeout=5)
                except Exception as e:
                    logger.warning(f"Failed to insert AI recipes into Supabase: {e}")
                    
            all_recipes.extend(ai_recipes)
        except Exception as e:
            logger.error("Generation Error: %s", e)
            if len(all_recipes) == 0:
                raise HTTPException(status_code=500, detail=f"Failed to generate recipes: {str(e)}") from e
            
    return GenerationResponse(recipes=all_recipes)
