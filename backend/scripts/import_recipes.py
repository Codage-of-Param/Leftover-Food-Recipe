import csv
import json
import urllib.request
import ast

SUPABASE_URL = "https://syzsktdvuswyobosmlyy.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5enNrdGR2dXN3eW9ib3NtbHl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDIxMzkyNCwiZXhwIjoyMDk5Nzg5OTI0fQ.N2sksMRTvvAM67OgBiGoQ3TH0d7J5eaj66H2_yxob1o"

HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def insert_batch(table, records):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    req = urllib.request.Request(url, data=json.dumps(records).encode("utf-8"), headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(req) as response:
            pass
        print(f"Successfully inserted {len(records)} records into {table}")
    except urllib.error.HTTPError as e:
        print(f"Error inserting {len(records)} records: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Error inserting {len(records)} records: {e}")

def parse_ingredients_indori(ing_str):
    if not ing_str:
        return []
    ing_str = str(ing_str).strip()
    if ing_str.startswith('[') and ing_str.endswith(']'):
        items = ing_str[1:-1].split(',')
        return [i.strip() for i in items if i.strip()]
    return [ing_str]

def parse_list_string(l_str):
    if not l_str:
        return []
    try:
        return ast.literal_eval(l_str)
    except:
        return [l_str]

def process_food_recipes(filepath):
    print(f"Processing {filepath}")
    records = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                mins = row.get("minutes", "0")
                try:
                    cook_time = int(mins)
                except:
                    cook_time = None
                    
                record = {
                    "title": str(row.get("name", "")),
                    "source_id": str(row.get("id", "")),
                    "cook_time_minutes": cook_time,
                    "instructions": str(row.get("steps", "")),
                    "description": str(row.get("description", "")),
                    "ingredients_list": parse_list_string(row.get("ingredients", "[]")),
                    "source": "Food_Recipes.csv"
                }
                records.append(record)
            except Exception as e:
                print(f"Error processing row {row.get('id')}: {e}")
                
            if len(records) >= 100:
                insert_batch("recipes", records)
                records = []
    
    if records:
        insert_batch("recipes", records)

def process_indori(filepath):
    print(f"Processing {filepath}")
    records = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            try:
                prep = row.get("preparation_time", "0")
                try:
                    cook_time = int(prep)
                except:
                    cook_time = None
                    
                record = {
                    "title": str(row.get("recipe_name", "")),
                    "cuisine": str(row.get("cuisine", "")),
                    "category": str(row.get("category", "")),
                    "cook_time_minutes": cook_time,
                    "instructions": str(row.get("cooking_instructions", "")),
                    "ingredients_list": parse_ingredients_indori(row.get("ingredients", "[]")),
                    "source": "INDORI.csv"
                }
                records.append(record)
            except Exception as e:
                print(f"Error processing row {idx}: {e}")
                
            if len(records) >= 100:
                insert_batch("recipes", records)
                records = []
                
    if records:
        insert_batch("recipes", records)

if __name__ == "__main__":
    food_recipes_path = r"C:\Users\pcoda\OneDrive\Dataset{Manually}\!eftover food recipe\Food_Recipes.csv"
    indori_path = r"C:\Users\pcoda\OneDrive\Dataset{Manually}\!eftover food recipe\INDORI.csv"
    
    process_food_recipes(food_recipes_path)
    process_indori(indori_path)
    print("Done importing recipes.")
