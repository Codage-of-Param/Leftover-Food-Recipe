import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const BUCKET_NAME = "chat-history";

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// GET /api/chat-history?userId=<uuid>
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000001";

    const supabase = getSupabaseAdmin();

    const filePath = `${userId}/last_5_chats.json`;
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(filePath);

    if (error || !data) {
      return NextResponse.json({ history: [] });
    }

    const text = await data.text();
    const history = JSON.parse(text);

    return NextResponse.json({
      history: Array.isArray(history) ? history : [],
      source: "supabase_storage",
    });
  } catch (err: any) {
    console.warn("Error fetching chat history from Supabase storage:", err);
    return NextResponse.json({ history: [] });
  }
}

// POST /api/chat-history
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || "00000000-0000-0000-0000-000000000001";
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];

    if (rawMessages.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Keep the last 5 user-assistant exchanges or last 10 messages (5 user prompts + 5 assistant responses)
    // plus the welcome message if present
    const nonWelcome = rawMessages.filter((m: any) => m.id !== "msg-welcome" && m.id !== "msg-1");
    const last5Interactions = nonWelcome.slice(-10); // 5 pairs of user & assistant messages

    const cleanHistory = [
      ...rawMessages.filter((m: any) => m.id === "msg-welcome" || m.id === "msg-1"),
      ...last5Interactions
    ].map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      isError: m.isError,
      attachments: m.attachments?.map((att: any) => ({
        id: att.id,
        name: att.name,
        type: att.type,
        size: att.size,
        dataUrl: att.dataUrl,
        textContent: att.textContent,
        isImage: att.isImage,
      })),
      recipeCards: m.recipeCards,
      scanResults: m.scanResults,
    }));

    const supabase = getSupabaseAdmin();

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = (buckets || []).some((b: any) => b.name === BUCKET_NAME);
    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET_NAME, { public: true });
    }

    const filePath = `${userId}/last_5_chats.json`;
    const jsonBlob = Buffer.from(JSON.stringify(cleanHistory, null, 2), "utf-8");

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, jsonBlob, {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadError) {
      console.warn("Supabase storage upload error:", uploadError);
    }

    // Also backup to database public.rescue_sessions if possible
    try {
      await supabase.from("rescue_sessions").upsert([
        {
          id: userId,
          user_id: userId,
          constraints_json: { last_5_chats: cleanHistory },
          created_at: new Date().toISOString(),
        }
      ]);
    } catch (dbErr) {
      // ignore DB fallback errors if schema differs
    }

    return NextResponse.json({
      success: true,
      count: cleanHistory.length,
      storagePath: filePath,
    });
  } catch (err: any) {
    console.error("Error saving chat history to Supabase storage:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to store chat history" },
      { status: 500 }
    );
  }
}
