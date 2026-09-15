-- ==============================================================================
-- SUPABASE POSTGRES SCHEMA 
-- ==============================================================================

-- Enable UUID & pg_trgm extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. INGREDIENTS (Canonical Ingredients)
CREATE TABLE IF NOT EXISTS public.ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_name TEXT UNIQUE NOT NULL,
    category TEXT,
    is_cv_supported BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on canonical_name for fast lookup and trigram search
CREATE INDEX IF NOT EXISTS idx_ingredients_canonical_trgm ON public.ingredients USING gin (canonical_name gin_trgm_ops);

-- 2. INGREDIENT ALIASES (Mapping raw text / vernacular / Hindi names to canonical)
CREATE TABLE IF NOT EXISTS public.ingredient_aliases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    alias TEXT UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ingredient_aliases_alias_trgm ON public.ingredient_aliases USING gin (alias gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ingredient_aliases_ingredient_id ON public.ingredient_aliases(ingredient_id);

-- 3. RECIPES (Merged from INDORI.csv & Food_Recipes.csv)
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    source TEXT NOT NULL, -- 'indori' | 'food_recipes'
    source_id TEXT,       -- original ID from source dataset if any
    cuisine TEXT,
    category TEXT,
    cook_time_minutes INT,
    servings INT DEFAULT 2,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON public.recipes(cuisine);
CREATE INDEX IF NOT EXISTS idx_recipes_title_trgm ON public.recipes USING gin (title gin_trgm_ops);

-- 4. RECIPE INGREDIENTS (Join table for recipe matching engine)
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    raw_ingredient_text TEXT,
    quantity NUMERIC,
    unit TEXT,
    is_required BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id ON public.recipe_ingredients(ingredient_id);

-- 5. NUTRITION DATA (From USDA.csv and canonical nutrition mappings)
CREATE TABLE IF NOT EXISTS public.nutrition_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE SET NULL,
    fdc_id TEXT,
    food_description TEXT,
    serving_size_g NUMERIC DEFAULT 100,
    calories NUMERIC DEFAULT 0,
    protein_g NUMERIC DEFAULT 0,
    carbs_g NUMERIC DEFAULT 0,
    fat_g NUMERIC DEFAULT 0,
    fiber_g NUMERIC DEFAULT 0,
    source TEXT DEFAULT 'usda_fdc'
);

CREATE INDEX IF NOT EXISTS idx_nutrition_ingredient_id ON public.nutrition_data(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_fdc_id ON public.nutrition_data(fdc_id);

-- 6. USERS & SESSIONS (Optional / Auth support)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    has_completed_onboarding BOOLEAN DEFAULT FALSE,
    allergies TEXT[] DEFAULT '{}',
    dietary_preference TEXT DEFAULT 'Any',
    staple_baselines TEXT[] DEFAULT '{}',
    max_cooking_time INT DEFAULT 45,
    level INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rescue_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    constraints_json JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ingredient_name TEXT NOT NULL,
    quantity TEXT,
    category TEXT,
    days_left INT,
    is_urgent BOOLEAN DEFAULT FALSE,
    source TEXT DEFAULT 'manual', -- 'detected' | 'manual'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.saved_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, recipe_id)
);

-- 7. COOKED HISTORY
CREATE TABLE IF NOT EXISTS public.cooked_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipe_title TEXT NOT NULL,
    rescued_ingredients TEXT[] DEFAULT '{}',
    cooked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: Enable Row Level Security (RLS) on all user-facing tables
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.cooked_history ENABLE ROW LEVEL SECURITY;

-- 8. RECIPE REVIEWS
CREATE TABLE IF NOT EXISTS public.recipe_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    recipe_id TEXT,
    recipe_title TEXT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_reviews_user_id ON public.recipe_reviews(user_id);
