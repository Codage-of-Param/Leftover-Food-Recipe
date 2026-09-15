import os
import logging
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

logger = logging.getLogger("chat_router")
router = APIRouter()

class AttachmentModel(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    isImage: Optional[bool] = False
    content: Optional[str] = None

class UserConstraintsModel(BaseModel):
    dietaryPreference: Optional[str] = "Any"
    allergies: Optional[List[str]] = None
    maxCookingTime: Optional[int] = 45

class ChatRequest(BaseModel):
    userMessage: Optional[str] = None
    message: Optional[str] = None
    attachments: Optional[List[AttachmentModel]] = None
    userConstraints: Optional[UserConstraintsModel] = None

@router.post("/chat")
async def chat_completion(req: ChatRequest):
    user_msg = (req.userMessage or req.message or "").strip()
    attachments = req.attachments or []
    constraints = req.userConstraints or UserConstraintsModel()
    
    if not user_msg and not attachments:
        raise HTTPException(status_code=400, detail="Invalid request. 'userMessage' or attachment is required.")

    diet_pref = constraints.dietaryPreference or "Any"
    allergies_list = ", ".join(constraints.allergies) if constraints.allergies else "None"
    max_time = constraints.maxCookingTime or 45

    system_instruction = (
        f"You are a zero-waste culinary expert and helpful assistant. "
        f"Help users rescue food, generate creative recipes from fridge/pantry items or uploaded photos/files, and provide zero-waste storage tips.\n\n"
        f"STRICT USER DIETARY & SAFETY RULES:\n"
        f"- Dietary Preference: {diet_pref} (Adhere strictly to this preference, e.g. Vegetarian, Vegan, Keto, etc.)\n"
        f"- MUST AVOID ALLERGENS / INGREDIENTS: {allergies_list} (NEVER include or recommend any ingredients matching this avoid list under any circumstances)\n"
        f"- Max Cooking Time: {max_time} minutes"
    )

    # Format attachment details into prompt
    final_prompt = user_msg or "Analyze the uploaded attachment(s) and provide a zero-waste recipe."
    if attachments:
        att_details = []
        for idx, att in enumerate(attachments):
            if att.isImage:
                att_details.append(f"[Attached Image {idx + 1}: {att.name or 'image.jpg'}]")
            elif att.content:
                att_details.append(f"[Attached File {idx + 1}: {att.name}]\nFile Content:\n{att.content[:1500]}")
        final_prompt = f"{final_prompt}\n\nAttached Context:\n" + "\n\n".join(att_details)

    # Combined prompt for models without system prompt param
    full_prompt = f"{system_instruction}\n\nUser Message:\n{final_prompt}"

    # 1. Try OpenRouter API if OPENROUTER_API_KEY is configured
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    if openrouter_key and "mock-or-set-your-key-here" not in openrouter_key:
        headers = {
            "Authorization": f"Bearer {openrouter_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "Food Rescue AI",
        }
        payload = {
            "model": "openrouter/free",
            "messages": [
                {
                    "role": "system",
                    "content": system_instruction
                },
                {
                    "role": "user",
                    "content": final_prompt
                }
            ]
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
                if resp.status_code == 200:
                    return resp.json()
                logger.warning("OpenRouter API returned status %s, falling back to Gemini API", resp.status_code)
            except Exception as exc:
                logger.warning("OpenRouter connection failed (%s), falling back to Gemini API", exc)

    # 2. Fallback to Gemini API using GEMINI_API_KEY / GOOGLE_API_KEY
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not gemini_key:
        from dotenv import load_dotenv
        load_dotenv()
        gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    if not gemini_key:
        raise HTTPException(
            status_code=500,
            detail="Neither OPENROUTER_API_KEY nor GEMINI_API_KEY is set. Please set OPENROUTER_API_KEY or GEMINI_API_KEY in your backend/.env or frontend/.env.local file."
        )

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=gemini_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=full_prompt
        )

        return {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": response.text or "Generated response successfully."
                    }
                }
            ]
        }
    except Exception as exc:
        logger.error("Gemini API call failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"AI Service call failed: {exc}") from exc
