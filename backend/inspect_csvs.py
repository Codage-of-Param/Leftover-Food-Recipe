import urllib.request
import json
import csv
import io

SUPABASE_URL = "https://syzsktdvuswyobosmlyy.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5enNrdGR2dXN3eW9ib3NtbHl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDIxMzkyNCwiZXhwIjoyMDk5Nzg5OTI0fQ.N2sksMRTvvAM67OgBiGoQ3TH0d7J5eaj66H2_yxob1o"
BUCKET = "Dataset%20LOFR"

files = ["Food_Recipes.csv", "INDORI.csv", "USDA.csv"]

for fname in files:
    download_url = f"{SUPABASE_URL}/storage/v1/object/authenticated/{BUCKET}/{fname}"
    headers = {
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}"
    }
    req = urllib.request.Request(download_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8", errors="replace")
            reader = csv.reader(io.StringIO(content))
            header = next(reader, None)
            sample_row = next(reader, None)
            print(f"\n==================== {fname} ====================")
            print("Headers:", header)
            print("Sample Row:", sample_row[:5] if sample_row else None)
            # count lines
            total_rows = 1 + sum(1 for _ in reader)
            print(f"Total rows approx: {total_rows}")
    except Exception as e:
        print(f"Error reading {fname}: {e}")
