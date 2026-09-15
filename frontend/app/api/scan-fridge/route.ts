import { NextResponse } from "next/server";

const NON_FOOD_OBJECTS = new Set([
  "bottle", "container", "jar", "shelf", "rack", "drawer", "tray",
  "lid", "utensil", "fork", "knife", "spoon", "plate", "bowl",
  "wrapper", "bag", "box", "carton",
]);

const DETECTION_PROMPT = `You are analyzing a photo of the inside of a fridge or pantry
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
  inflate this number.
- Give a normalized bounding box (values 0-1 relative to image width/height).

Return ONLY valid JSON, no markdown fences, no commentary, in this exact shape:
{
  "ingredients": [
    {"name": "tomato", "confidence": 95, "bounding_box": {"x": 0.12, "y": 0.30, "width": 0.15, "height": 0.18}}
  ]
}
If nothing food-related is visible, return {"ingredients": []}.
`;

function tierFor(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 90) return "high";
  if (confidence >= 60) return "medium";
  return "low";
}

function isNonFood(name: string): boolean {
  const lower = name.toLowerCase().trim();
  const tokens = new Set(lower.split(/\s+/));
  return NON_FOOD_OBJECTS.has(lower) || (tokens.size > 0 && [...tokens].every(t => NON_FOOD_OBJECTS.has(t)));
}

export async function POST(req: Request) {
  try {
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured in .env.local" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    const contentType = imageFile.type;
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      return NextResponse.json({ error: `Unsupported image type: ${contentType}` }, { status: 400 });
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const OPENROUTER_VISION_MODELS = [
      "inclusionai/ling-3.0-flash-vl:free",
      "openrouter/free"
    ];

    let rawText = "";
    let openrouterSuccess = false;

    for (const orModel of OPENROUTER_VISION_MODELS) {
      try {
        const openrouterPayload = {
          model: orModel,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: DETECTION_PROMPT },
                { type: "image_url", image_url: { url: `data:${contentType};base64,${base64}` } }
              ]
            }
          ]
        };

        const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Food Rescue Scanner",
          },
          body: JSON.stringify(openrouterPayload)
        });

        if (orRes.ok) {
          const orData = await orRes.json();
          rawText = orData.choices?.[0]?.message?.content?.trim() || "{}";
          openrouterSuccess = true;
          break;
        } else {
          const errText = await orRes.text();
          console.error(`OpenRouter model ${orModel} returned ${orRes.status}: ${errText.slice(0, 150)}`);
        }
      } catch (orErr: any) {
        console.error(`OpenRouter model ${orModel} threw error:`, orErr.message);
      }
    }

    if (!openrouterSuccess) {
      return NextResponse.json(
        { error: "OpenRouter free vision model failed to process image. Please try again." },
        { status: 502 }
      );
    }

    // Strip markdown fences if present
    if (rawText.startsWith("```json")) rawText = rawText.replace("```json", "").trim();
    if (rawText.startsWith("```")) rawText = rawText.replace("```", "").trim();
    if (rawText.endsWith("```")) rawText = rawText.slice(0, -3).trim();

    const parsed = JSON.parse(rawText);

    // Post-process: group, filter non-food, assign tiers
    const grouped: Record<string, { baseName: string; count: number; maxConfidence: number; bbox: any }> = {};

    for (const item of parsed.ingredients || []) {
      const rawName = String(item.name || "").trim();
      if (!rawName || isNonFood(rawName)) continue;

      let baseName = rawName.toLowerCase();
      if (baseName.includes(" (x")) baseName = baseName.split(" (x")[0].trim();

      const confidence = Math.max(0, Math.min(100, Number(item.confidence) || 0));
      const bbox = item.bounding_box || null;

      if (!grouped[baseName]) {
        grouped[baseName] = { baseName, count: 1, maxConfidence: confidence, bbox };
      } else {
        grouped[baseName].count += 1;
        grouped[baseName].maxConfidence = Math.max(grouped[baseName].maxConfidence, confidence);
        if (!grouped[baseName].bbox && bbox) grouped[baseName].bbox = bbox;
      }
    }

    const ingredients = Object.entries(grouped).map(([, info], idx) => {
      const displayName = info.count > 1
        ? `${info.baseName.charAt(0).toUpperCase() + info.baseName.slice(1)} (x${info.count})`
        : info.baseName.charAt(0).toUpperCase() + info.baseName.slice(1);

      return {
        id: `scan-${idx}`,
        name: displayName,
        confidence: info.maxConfidence,
        tier: tierFor(info.maxConfidence),
        bounding_box: info.bbox,
        source: "ai",
      };
    });

    return NextResponse.json({ ingredients });
  } catch (err: any) {
    console.error("Scan fridge error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to analyze image" },
      { status: 500 }
    );
  }
}
