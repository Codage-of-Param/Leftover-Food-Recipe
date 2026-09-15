import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, Numeric, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import sqlite3

# For SQLite compatibility during MVP, we'll use a string for UUIDs if using SQLite, 
# but define them as standard UUIDs. Let's use standard String(36) for cross-compatibility in MVP,
# or standard SQLAlchemy UUID type (supported in 2.0+).
from sqlalchemy.types import Uuid

Base = declarative_base()

class Ingredient(Base):
    __tablename__ = "ingredients"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    canonical_name = Column(String, unique=True, nullable=False)
    category = Column(String, nullable=True)
    is_cv_supported = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    aliases = relationship("IngredientAlias", back_populates="ingredient")
    nutrition = relationship("NutritionData", uselist=False, back_populates="ingredient")

class IngredientAlias(Base):
    __tablename__ = "ingredient_aliases"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    ingredient_id = Column(Uuid, ForeignKey("ingredients.id"), nullable=False)
    alias = Column(String, unique=True, index=True, nullable=False)
    
    ingredient = relationship("Ingredient", back_populates="aliases")

class Recipe(Base):
    __tablename__ = "recipes"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    source = Column(String, default="indori")
    cuisine = Column(String, index=True, nullable=True)
    cook_time_minutes = Column(Integer, nullable=True)
    servings = Column(Integer, nullable=True)
    instructions = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    ingredients = relationship("RecipeIngredient", back_populates="recipe")

class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    recipe_id = Column(Uuid, ForeignKey("recipes.id"), nullable=False)
    ingredient_id = Column(Uuid, ForeignKey("ingredients.id"), index=True, nullable=False)
    quantity = Column(Numeric, nullable=True)
    unit = Column(String, nullable=True)
    is_required = Column(Boolean, default=True)
    
    recipe = relationship("Recipe", back_populates="ingredients")
    ingredient = relationship("Ingredient")

class NutritionData(Base):
    __tablename__ = "nutrition_data"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    ingredient_id = Column(Uuid, ForeignKey("ingredients.id"), nullable=False)
    serving_size_g = Column(Numeric, nullable=False)
    calories = Column(Numeric, nullable=False)
    protein_g = Column(Numeric, nullable=False)
    carbs_g = Column(Numeric, nullable=False)
    fat_g = Column(Numeric, nullable=False)
    fiber_g = Column(Numeric, nullable=True)
    source = Column(String, default="usda_fdc")
    
    ingredient = relationship("Ingredient", back_populates="nutrition")

class User(Base):
    __tablename__ = "users"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4) # matches Supabase auth UID
    display_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sessions = relationship("RescueSession", back_populates="user")
    saved_recipes = relationship("SavedRecipe", back_populates="user")

class RescueSession(Base):
    __tablename__ = "rescue_sessions"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    constraints_json = Column(JSON, nullable=True) # JSONB in PG, JSON in SQLite
    
    user = relationship("User", back_populates="sessions")
    inventory = relationship("InventoryItem", back_populates="session")

class InventoryItem(Base):
    __tablename__ = "inventory_items"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    session_id = Column(Uuid, ForeignKey("rescue_sessions.id"), nullable=False)
    ingredient_id = Column(Uuid, ForeignKey("ingredients.id"), nullable=False)
    quantity = Column(Numeric, nullable=True)
    unit = Column(String, nullable=True)
    use_first = Column(Boolean, default=False)
    source = Column(String, nullable=False) # "detected" | "manual"
    detection_confidence = Column(Numeric, nullable=True)
    
    session = relationship("RescueSession", back_populates="inventory")
    ingredient = relationship("Ingredient")

class SavedRecipe(Base):
    __tablename__ = "saved_recipes"
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id"), nullable=False)
    recipe_id = Column(Uuid, ForeignKey("recipes.id"), nullable=False)
    saved_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="saved_recipes")
    recipe = relationship("Recipe")
