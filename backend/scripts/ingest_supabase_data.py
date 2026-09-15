"""
Automated ETL script to download CSVs from Supabase Storage 'Dataset LOFR' 
and populate Supabase PostgreSQL database tables.
"""

import os
import io
import re
import csv
import ast
import json
import urllib.request
from typing import List, Dict, Set

SUPABASE_URL = "https://syzsktdvuswyobosmlyy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5enNrdGR2dXN3eW9ib3NtbHl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDIxMzkyNCwiZXhwIjoyMDk5Nzg5OTI0fQ.N2sksMRTvvAM67OgBiGoQ3TH0d7J5eaj66H2_yxob1o"
BUCKET_NAME = "Dataset%20LOFR"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=ignore-duplicates,return=representation"
}

def clean_ingredient_name(name: str) -> str:
    """Normalize raw ingredient string into clean canonical name."""
    if not name:
        return ""
    name = name.lower().strip()
    name = re.sub(r"[\[\]'\"()]", "", name)
    name = re.sub(r"\s+", " ", name)
    return name.strip()

def download_csv_from_storage(filename: str) -> str:
    """Download CSV directly from Supabase Storage."""
    print(f"[*] Downloading {filename} from Supabase Storage bucket...", flush=True)
    url = f"{SUPABASE_URL}/storage/v1/object/authenticated/{BUCKET_NAME}/{filename}"
    req = urllib.request.Request(url, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
    with urllib.request.urlopen(req) as resp:
        return resp.read().decode("utf-8", errors="replace")

def post_batch(table: str, rows: List[Dict]) -> List[Dict]:
    """Insert batch of rows into Supabase via REST API."""
    if not rows:
        return []
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    data = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            if content:
                try:
                    return json.loads(content)
                except Exception:
                    return []
            return []
    except urllib.error.HTTPError as e:
        print(f"Error inserting into {table}: {e.code} - {e.read().decode('utf-8')}", flush=True)
        return []
    except Exception as e:
        print(f"Error inserting into {table}: {e}", flush=True)
        return []

def get_all(table: str, select: str = "*") -> List[Dict]:
    """Fetch all rows from a table."""
    url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}&limit=10000"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"Error fetching from {table}: {e}", flush=True)
        return []

def run_etl():
    print("=" * 60, flush=True)
    print("STARTING SUPABASE DATASET INGESTION ETL", flush=True)
    print("=" * 60, flush=True)

    # 1. Fetch USDA.csv for Nutrition Data
    usda_raw = download_csv_from_storage("USDA.csv")
    usda_reader = csv.DictReader(io.StringIO(usda_raw))
    
    nutrition_rows = []
    for row in usda_reader:
        fdc_id = row.get("fdc_id", "")
        desc = row.get("description", "")
        if fdc_id and desc:
            nutrition_rows.append({
                "fdc_id": fdc_id,
                "food_description": desc,
                "source": "usda_fdc"
            })
            if len(nutrition_rows) >= 200:
                post_batch("nutrition_data", nutrition_rows)
                nutrition_rows = []
    if nutrition_rows:
        post_batch("nutrition_data", nutrition_rows)
    print("✓ USDA nutrition dataset loaded.", flush=True)

    # 2. Ingest INDORI.csv
    indori_raw = download_csv_from_storage("INDORI.csv")
    indori_reader = csv.DictReader(io.StringIO(indori_raw))
    
    unique_ingredients: Set[str] = set()
    indori_recipes = []
    
    for row in indori_reader:
        recipe_name = row.get("recipe_name", "").strip()
        if not recipe_name:
            continue
        cuisine = row.get("cuisine", "").strip()
        category = row.get("category", "").strip()
        prep_time_str = row.get("preparation_time", "20")
        try:
            m = re.search(r"\d+", prep_time_str)
            prep_time = int(m.group()) if m else 20
        except Exception:
            prep_time = 20
        instructions = row.get("cooking_instructions", "").strip()
        
        # Parse ingredients
        ing_raw = row.get("ingredients", "[]")
        try:
            parsed_ings = ast.literal_eval(ing_raw) if ing_raw.startswith("[") else [i.strip() for i in ing_raw.split(",")]
        except Exception:
            parsed_ings = [clean_ingredient_name(i) for i in ing_raw.replace("[", "").replace("]", "").split(",")]
        
        cleaned_ings = [clean_ingredient_name(i) for i in parsed_ings if clean_ingredient_name(i)]
        for ing in cleaned_ings:
            unique_ingredients.add(ing)
            
        indori_recipes.append({
            "title": recipe_name,
            "source": "indori",
            "cuisine": cuisine,
            "category": category,
            "cook_time_minutes": prep_time,
            "instructions": instructions,
            "ingredients_list": cleaned_ings
        })

    # 3. Ingest Food_Recipes.csv
    food_recipes_raw = download_csv_from_storage("Food_Recipes.csv")
    food_reader = csv.DictReader(io.StringIO(food_recipes_raw))
    
    food_recipes = []
    for row in food_reader:
        name = row.get("name", "").strip()
        if not name:
            continue
        minutes_str = row.get("minutes", "30")
        try:
            minutes = int(minutes_str) if minutes_str.isdigit() else 30
        except Exception:
            minutes = 30
        steps = row.get("steps", "")
        
        ing_raw = row.get("ingredients", "[]")
        try:
            parsed_ings = ast.literal_eval(ing_raw) if ing_raw.startswith("[") else [i.strip() for i in ing_raw.split(",")]
        except Exception:
            parsed_ings = [clean_ingredient_name(i) for i in ing_raw.replace("[", "").replace("]", "").split(",")]
            
        cleaned_ings = [clean_ingredient_name(i) for i in parsed_ings if clean_ingredient_name(i)]
        for ing in cleaned_ings:
            unique_ingredients.add(ing)
            
        food_recipes.append({
            "title": name,
            "source": "food_recipes",
            "source_id": row.get("id", ""),
            "cook_time_minutes": minutes,
            "instructions": steps,
            "ingredients_list": cleaned_ings
        })

    print(f"✓ Parsed {len(unique_ingredients)} unique ingredients.", flush=True)
    print(f"✓ Parsed {len(indori_recipes)} INDORI recipes and {len(food_recipes)} Food_Recipes.", flush=True)

    # 4. Insert canonical ingredients in batches
    ing_batches = []
    for ing in unique_ingredients:
        ing_batches.append({"canonical_name": ing, "is_cv_supported": True})
        if len(ing_batches) >= 200:
            post_batch("ingredients", ing_batches)
            ing_batches = []
    if ing_batches:
        post_batch("ingredients", ing_batches)
    print("✓ Ingredients inserted into Supabase.", flush=True)

    # Fetch inserted ingredients map: canonical_name -> id
    print("[*] Building ingredient lookup map...", flush=True)
    db_ingredients = get_all("ingredients", "id,canonical_name")
    ing_map = {row["canonical_name"]: row["id"] for row in db_ingredients if "canonical_name" in row and "id" in row}
    print(f"✓ Mapped {len(ing_map)} ingredients to DB IDs.", flush=True)

    # 5. Insert Recipes and Recipe Ingredients
    all_recipes = indori_recipes + food_recipes
    print(f"[*] Ingesting {len(all_recipes)} recipes with ingredient relationships...", flush=True)
    
    for i, r in enumerate(all_recipes):
        recipe_data = {
            "title": r["title"],
            "source": r["source"],
            "source_id": r.get("source_id"),
            "cuisine": r.get("cuisine"),
            "category": r.get("category"),
            "cook_time_minutes": r["cook_time_minutes"],
            "instructions": r["instructions"]
        }
        res = post_batch("recipes", [recipe_data])
        if res and len(res) > 0:
            recipe_id = res[0].get("id")
            if recipe_id:
                ri_batch = []
                for ing_name in r["ingredients_list"]:
                    ing_id = ing_map.get(ing_name)
                    if ing_id:
                        ri_batch.append({
                            "recipe_id": recipe_id,
                            "ingredient_id": ing_id,
                            "raw_ingredient_text": ing_name,
                            "is_required": True
                        })
                if ri_batch:
                    post_batch("recipe_ingredients", ri_batch)
        
        if (i + 1) % 250 == 0 or i == len(all_recipes) - 1:
            print(f"  -> Processed {i + 1}/{len(all_recipes)} recipes...", flush=True)

    print("\n" + "=" * 60, flush=True)
    print("🎉 ALL DATASETS INGESTED & LINKED IN SUPABASE POSTGRES!", flush=True)
    print("=" * 60, flush=True)

if __name__ == "__main__":
    run_etl()
