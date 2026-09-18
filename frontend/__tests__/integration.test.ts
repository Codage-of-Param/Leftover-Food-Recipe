import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../app/api/chat/route";
import { NextRequest } from "next/server";

// Generic chainable mock for Supabase
const createChainMock = (dataToReturn: any) => {
  const chain: any = {
    insert: vi.fn().mockResolvedValue({ data: dataToReturn, error: null }),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn().mockResolvedValue({ data: dataToReturn, error: null })
  };
  return chain;
};

// Mock Supabase
vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn(() => ({
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            id: "db-recipe-1",
            title: "DB Match Recipe",
            cook_time_minutes: 20,
            similarity_score: 95,
            ingredients_list: ["eggs", "rice"]
          },
          {
            id: "db-recipe-2",
            title: "DB Match Recipe 2",
            cook_time_minutes: 25,
            similarity_score: 90,
            ingredients_list: ["eggs", "rice", "beans"]
          }
        ],
        error: null
      }),
      from: vi.fn(() => createChainMock([]))
    }))
  };
});

describe("Integration: /api/chat Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({ 
      ok: false, 
      json: vi.fn().mockResolvedValue({}) 
    });
    process.env.OPENROUTER_API_KEY = "test_key";
    process.env.GEMINI_API_KEY = "test_key";
  });

  it("should return 400 if userMessage and attachments are missing", async () => {
    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it("should hit the database and return DB matches when available", async () => {
    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        userMessage: "I have eggs and rice",
        userConstraints: {
          maxCookingTime: 30,
          dietaryPreference: "Any",
          allergies: []
        }
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    
    const json = await response.json();
    expect(json.choices[0].message.content).toContain("I found 2 recipes");
    expect(json.choices[0].message.content).toContain("DB Match Recipe");
  });

  it("should fall back to LLM generation when DB has no matches", async () => {
    // Mock Supabase to return NO results so it forces LLM call
    const supabaseClient = await import("@supabase/supabase-js");
    (supabaseClient.createClient as any).mockImplementation(() => ({
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      from: vi.fn(() => createChainMock([]))
    }));

    // Mock fetch for LLM
    const mockLlmResponse = {
      choices: [
        {
          message: {
            content: `\`\`\`json
[
  {
    "title": "LLM Generated Recipe",
    "desc": "A yummy recipe",
    "score": 90,
    "difficulty": "Easy",
    "prep_time": 5,
    "cook_time": 10,
    "servings": 2,
    "cals": 300,
    "protein": "10g",
    "carbs": "20g",
    "fat": "5g",
    "fiber": "2g",
    "isVeg": true,
    "eco_score": 100,
    "co2Saved": 1,
    "ingredients": [{ "name": "magic beans", "quantity": "1 cup", "inPantry": false }],
    "instructions": ["Cook beans."]
  }
]
\`\`\``
          }
        }
      ]
    };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockLlmResponse)
    });

    const req = new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({
        userMessage: "make a magic bean recipe",
        userConstraints: {}
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    
    const json = await response.json();
    expect(json.choices[0].message.content).toContain("LLM Generated Recipe");
  });
});
