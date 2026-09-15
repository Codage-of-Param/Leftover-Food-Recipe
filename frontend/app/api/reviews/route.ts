import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// GET /api/reviews?userId=<uuid>
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000001";

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("recipe_reviews")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching reviews:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reviews: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/reviews
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, recipeId, recipeTitle, rating, reviewText } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }

    const uid = userId || "00000000-0000-0000-0000-000000000001";
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.from("recipe_reviews").insert([
      {
        user_id: uid,
        recipe_id: recipeId || null,
        recipe_title: recipeTitle || "Unknown Recipe",
        rating: rating,
        review_text: reviewText || null,
      },
    ]).select();

    if (error) {
      console.error("Error inserting review:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, review: data[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
