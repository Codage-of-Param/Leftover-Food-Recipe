from fastapi import APIRouter, HTTPException
from typing import List
import uuid

from app.schemas.api_models import (
    DetectionResponse,
    DetectionResult,
    RecommendationRequest,
    RecommendationResponse,
    RecipeRecommendation,
    ScoreBreakdownResponse,
    ScoreComponents
)

from app.api import scanner, generator, chat

router = APIRouter()
router.include_router(scanner.router, tags=["scanner"])
router.include_router(generator.router, tags=["generator"])
router.include_router(chat.router, tags=["chat"])

@router.post("/detect", response_model=DetectionResponse)
async def detect_ingredients():
    """
    Mock endpoint for image detection. 
    In production, this would receive a file upload, run OpenCV preprocessing, and call the CV API.
    """
    # Mock response based on TRD §28
    return DetectionResponse(
        session_id=uuid.uuid4(),
        detections=[
            DetectionResult(ingredient_id=uuid.uuid4(), label="tomato", confidence=0.96),
            DetectionResult(ingredient_id=uuid.uuid4(), label="paneer", confidence=0.64)
        ]
    )

@router.post("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(req: RecommendationRequest):
    """
    Mock endpoint for fetching recipe recommendations based on ingredients and constraints.
    """
    # Mock response based on TRD §28
    return RecommendationResponse(
        cook_now=[
            RecipeRecommendation(
                recipe_id=uuid.uuid4(),
                title="Paneer Fried Rice",
                rescue_score=94,
                missing_ingredients=[],
                cook_time_minutes=15
            )
        ],
        buy_one_or_two=[
            RecipeRecommendation(
                recipe_id=uuid.uuid4(),
                title="Veg Pulao",
                rescue_score=78,
                missing_ingredients=["peas"],
                cook_time_minutes=25
            )
        ],
        no_reliable_recipe=False
    )

@router.get("/recipes/{id}/score-breakdown", response_model=ScoreBreakdownResponse)
async def get_score_breakdown(id: uuid.UUID):
    """
    Mock endpoint for getting the detailed score breakdown of a specific recipe.
    """
    return ScoreBreakdownResponse(
        recipe_id=id,
        total=94,
        components=ScoreComponents(
            ingredient_coverage=40,
            priority_bonus=15,
            quantity_feasibility=25,
            time_compatibility=10,
            feasibility_class=10,
            missing_penalty=-5,
            extra_penalty=-1
        )
    )
