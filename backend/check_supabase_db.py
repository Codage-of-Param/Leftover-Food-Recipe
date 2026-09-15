import urllib.request
import json

SUPABASE_URL = "https://syzsktdvuswyobosmlyy.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5enNrdGR2dXN3eW9ib3NtbHl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDIxMzkyNCwiZXhwIjoyMDk5Nzg5OTI0fQ.N2sksMRTvvAM67OgBiGoQ3TH0d7J5eaj66H2_yxob1o"

tables_to_check = ["recipes", "ingredients", "recipe_ingredients", "nutrition_data", "ingredient_aliases"]

headers = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json"
}

for table in tables_to_check:
    url = f"{SUPABASE_URL}/rest/v1/{table}?select=count"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read().decode("utf-8")
            print(f"Table '{table}' exists! Response: {data}")
    except urllib.error.HTTPError as e:
        print(f"Table '{table}' HTTP {e.code}: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"Table '{table}' error: {e}")



