import base64
import json
import logging
import os
from enum import Enum
from typing import List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger("fridge_scanner")
router = APIRouter()

# --------------------------------------------------------------------------
# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------

GEMINI_MODEL = "gemini-3.6-flash"
FALLBACK_GEMINI_MODELS = []

HIGH_CONFIDENCE_THRESHOLD = 90
MEDIUM_CONFIDENCE_THRESHOLD = 60

NON_FOOD_OBJECTS = {
    "bottle", "container", "jar", "shelf", "rack", "drawer", "tray",
    "lid", "utensil", "fork", "knife", "spoon", "plate", "bowl",
    "wrapper", "bag", "box", "carton",
}

class ConfidenceTier(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class BoundingBox(BaseModel):
    x: float = Field(..., ge=0, le=1)
    y: float = Field(..., ge=0, le=1)
    width: float = Field(..., gt=0, le=1)
    height: float = Field(..., gt=0, le=1)

class DetectedIngredient(BaseModel):
    id: str
    name: str
    confidence: int = Field(..., ge=0, le=100)
    tier: ConfidenceTier
    bounding_box: Optional[BoundingBox] = None
    source: str = Field(default="ai")

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        return v.strip().lower()

class ScanResult(BaseModel):
    ingredients: List[DetectedIngredient]
    raw_model_response: Optional[dict] = None

class IngredientEdit(BaseModel):
    id: Optional[str] = None
    name: str
    action: str

class ConfirmedIngredientsRequest(BaseModel):
    scan_id: Optional[str] = None
    edits: List[IngredientEdit]

# --------------------------------------------------------------------------
# Gemini call
# --------------------------------------------------------------------------

DETECTION_PROMPT = """You are analyzing a photo of the inside of a fridge or pantry
to identify EDIBLE food ingredients only.

Rules:
- Only report actual food items (produce, dairy, meat, leftovers, condiments, etc).
- Do NOT report containers, bottles, jars, shelves, racks, utensils, wrappers,
  or packaging as separate items. If a food is inside/behind packaging and you
  can identify it (e.g. a milk carton, a labeled jar of pickles), report the
  FOOD name, not the container.
- If you truly cannot tell what food (if any) is in a container, skip it —
  do not guess a specific food to fill the gap.
- For each ingredient, give your own honest confidence (0-100) that (a) this
  is really a food item and (b) the name you gave it is correct. Do not
  inflate this number. If the item is partially occluded, blurry, or you are
  guessing between two plausible foods, that MUST be reflected as a lower
  number, not smoothed over.
- Give a normalized bounding box (values 0-1 relative to image width/height).

Return ONLY valid JSON, no markdown fences, no commentary, in this exact shape:
{
  "ingredients": [
    {"name": "tomato", "confidence": 95, "bounding_box": {"x": 0.12, "y": 0.30, "width": 0.15, "height": 0.18}}
  ]
}
If nothing food-related is visible, return {"ingredients": []}.
"""

def _call_gemini_vision(image_bytes: bytes, mime_type: str) -> dict:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        from dotenv import load_dotenv
        load_dotenv()
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set. Please set the GEMINI_API_KEY environment variable in backend/.env.")

    import httpx
    img_b64 = base64.b64encode(image_bytes).decode('utf-8')

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": mime_type or "image/jpeg",
                            "data": img_b64
                        }
                    },
                    {
                        "text": DETECTION_PROMPT
                    }
                ]
            }
        ],
        "generationConfig": {
            "response_mime_type": "application/json"
        }
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, json=payload)

        if response.status_code == 200:
            data = response.json()
            text = data['candidates'][0]['content']['parts'][0]['text'].strip()
            if text.startswith("```json"):
                text = text.replace("```json", "", 1)
            if text.startswith("```"):
                text = text.replace("```", "", 1)
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            return json.loads(text)
        elif response.status_code == 429:
            logger.warning("Gemini API rate limit/quota exceeded: %s", response.text)
            raise HTTPException(status_code=429, detail="Gemini API rate limit or quota exceeded. Please try again shortly or add items manually.")
        else:
            logger.error("Gemini API error %s: %s", response.status_code, response.text)
            raise RuntimeError(f"Gemini API returned status {response.status_code}: {response.text[:200]}")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Gemini Vision call failed: %s", exc)
        raise RuntimeError(f"Gemini Vision call failed: {exc}") from exc

def _tier_for(confidence: int) -> ConfidenceTier:
    if confidence >= HIGH_CONFIDENCE_THRESHOLD:
        return ConfidenceTier.HIGH
    if confidence >= MEDIUM_CONFIDENCE_THRESHOLD:
        return ConfidenceTier.MEDIUM
    return ConfidenceTier.LOW

def _is_non_food_label(name: str) -> bool:
    name_lower = name.lower().strip()
    tokens = set(name_lower.split())
    return name_lower in NON_FOOD_OBJECTS or (
        tokens and tokens.issubset(NON_FOOD_OBJECTS)
    )

def detect_ingredients(image_bytes: bytes, mime_type: str = "image/jpeg") -> ScanResult:
    raw = _call_gemini_vision(image_bytes, mime_type)

    grouped: dict[str, dict] = {}
    for item in raw.get("ingredients", []):
        raw_name = str(item.get("name", "")).strip()
        if not raw_name or _is_non_food_label(raw_name):
            continue

        base_name = raw_name.lower()
        if " (x" in base_name:
            base_name = base_name.split(" (x")[0].strip()
        elif " (qty" in base_name:
            base_name = base_name.split(" (qty")[0].strip()

        confidence = int(item.get("confidence", 0))
        confidence = max(0, min(100, confidence))
        qty_val = item.get("quantity", 1)
        qty = int(qty_val) if isinstance(qty_val, int) or (isinstance(qty_val, str) and qty_val.isdigit()) else 1

        bbox_raw = item.get("bounding_box")
        bbox = BoundingBox(**bbox_raw) if bbox_raw else None

        if base_name not in grouped:
            grouped[base_name] = {
                "base_name": base_name,
                "count": qty,
                "max_confidence": confidence,
                "bbox": bbox
            }
        else:
            grouped[base_name]["count"] += qty
            grouped[base_name]["max_confidence"] = max(grouped[base_name]["max_confidence"], confidence)
            if not grouped[base_name]["bbox"] and bbox:
                grouped[base_name]["bbox"] = bbox

    detected: List[DetectedIngredient] = []
    for idx, (base_name, info) in enumerate(grouped.items()):
        count = info["count"]
        conf = info["max_confidence"]
        tier = _tier_for(conf)
        display_name = f"{base_name.capitalize()} (x{count})" if count > 1 else base_name.capitalize()

        detected.append(
            DetectedIngredient(
                id=f"scan-{idx}",
                name=display_name,
                confidence=conf,
                tier=tier,
                bounding_box=info["bbox"],
                source="ai",
            )
        )
    return ScanResult(ingredients=detected, raw_model_response=raw)

_SCAN_STORE: dict[str, ScanResult] = {}

@router.post("/scan-fridge", response_model=ScanResult)
async def scan_fridge(image: UploadFile = File(...)):
    if image.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(400, f"Unsupported image type: {image.content_type}")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(400, "Empty image upload")

    try:
        result = detect_ingredients(image_bytes, image.content_type)
    except RuntimeError as exc:
        raise HTTPException(502, f"Detection failed: {exc}") from exc

    scan_id = f"scan-{len(_SCAN_STORE) + 1}"
    _SCAN_STORE[scan_id] = result
    return result

@router.post("/confirm-ingredients")
async def confirm_ingredients(payload: ConfirmedIngredientsRequest):
    final_names = []
    for edit in payload.edits:
        if edit.action == "remove":
            continue
        name = edit.name.strip().lower()
        if not name:
            continue
        final_names.append(name)

    if not final_names:
        raise HTTPException(400, "No confirmed ingredients to send")
    
    return {"confirmed_ingredients": final_names, "recipes": []}
