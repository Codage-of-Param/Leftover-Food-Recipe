from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid

class DetectionRequest(BaseModel):
    # In a real scenario, this would be a Form/File upload
    # For now, we mock it with a dummy request if needed, or handle via FastAPI File
    pass

class DetectionResult(BaseModel):
    ingredient_id: uuid.UUID
    label: str
    confidence: float

class DetectionResponse(BaseModel):
    session_id: uuid.UUID
    detections: List[DetectionResult]

class Constraints(BaseModel):
    max_time_minutes: Optional[int] = None
    servings: Optional[int] = None
    diet: Optional[str] = None
    cuisine: Optional[str] = None

class RecommendationRequest(BaseModel):
    session_id: uuid.UUID
    constraints: Constraints

class RecipeIngredient(BaseModel):
    name: str
    quantity: str
    inPantry: bool
    isUrgent: Optional[bool] = False
    substitution: Optional[str] = None

class RecipeRecommendation(BaseModel):
    id: str
    title: str
    desc: str
    score: int
    wasteSaved: float
    co2Saved: float
    timeMinutes: int
    servings: int
    cals: int
    protein: str
    isVeg: bool
    ingredients: List[RecipeIngredient]
    instructions: List[str]
    isBuyOneOrTwo: Optional[bool] = False
    missingIngredients: Optional[List[str]] = None

class RecommendationResponse(BaseModel):
    cook_now: List[RecipeRecommendation]
    buy_one_or_two: List[RecipeRecommendation]
    no_reliable_recipe: bool

class GenerationRequest(BaseModel):
    inventory: List[Dict[str, Any]]
    preferences: str
    allergies: List[str]
    maxCookingTime: int

class GenerationResponse(BaseModel):
    recipes: List[RecipeRecommendation]

class ScoreComponents(BaseModel):
    ingredient_coverage: int
    priority_bonus: int
    quantity_feasibility: int
    time_compatibility: int
    feasibility_class: int
    missing_penalty: int
    extra_penalty: int

class ScoreBreakdownResponse(BaseModel):
    recipe_id: uuid.UUID
    total: int
    components: ScoreComponents
