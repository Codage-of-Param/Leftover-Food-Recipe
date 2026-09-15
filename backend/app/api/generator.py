from fastapi import APIRouter, HTTPException
from google import genai
from google.genai import types
from google.genai.errors import APIError
import os
import json
import uuid
import logging
from typing import List
from ..schemas.api_models import GenerationRequest, GenerationResponse, RecipeRecommendation

logger = logging.getLogger("recipe_generator")
router = APIRouter()

@router.post("/generate", response_model=GenerationResponse)
async def generate_recipes(req: GenerationRequest):
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        from dotenv import load_dotenv
        load_dotenv()
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured in backend/.env file.")

    # Construct the prompt
    inventory_str = "\n".join([f"- {item.get('ingredient_name', 'Unknown')} (Quantity: {item.get('quantity', 'N/A')}, Urgent: {item.get('is_urgent', False)})" for item in req.inventory])
    allergies_str = ", ".join(req.allergies) if req.allergies else "None"
    
    prompt = f"""
    You are a zero-waste culinary expert. Given the following user's pantry inventory, their dietary preferences, allergies, and maximum cooking time, generate exactly 3 creative, delicious recipes.
    
    1 or 2 of these recipes should use ONLY what is in the pantry (100% match).
    1 or 2 can require exactly 1-2 missing ingredients to show what they could make if they bought a couple of things.
    
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
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        
        # Parse the JSON response
        raw_text = (response.text or "").strip()
        if raw_text.startswith("```json"):
            raw_text = raw_text.replace("```json", "", 1)
        if raw_text.startswith("```"):
            raw_text = raw_text.replace("```", "", 1)
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]
        
        parsed_json = json.loads(raw_text.strip())
        
        # Ensure all IDs are filled and convert to correct objects
        recipes = parsed_json.get("recipes", [])
        for r in recipes:
            if not r.get("id"):
                r["id"] = str(uuid.uuid4())
                
        # Validate against Pydantic schema
        return GenerationResponse(recipes=recipes)
    except APIError as exc:
        logger.error("Gemini API error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Gemini API error: {exc.message or exc}") from exc
    except Exception as e:
        logger.error("Generation Error: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to generate recipes: {str(e)}") from e
