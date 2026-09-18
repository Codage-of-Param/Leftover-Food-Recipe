import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ error: "Missing userId or newPassword" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseServiceKey) {
      // If no service role key, update password_hash in users table only
      const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
      await supabaseAnon.from("users").update({ password_hash: newPassword }).eq("id", userId);
      return NextResponse.json({ success: true, method: "table_only" });
    }

    // Use service role key to update the user's password in Supabase Auth
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (authError) {
      console.error("Failed to update auth password:", authError.message);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Also update the password_hash column in users table
    await supabaseAdmin.from("users").update({ password_hash: newPassword }).eq("id", userId);

    return NextResponse.json({ success: true, method: "auth_and_table" });
  } catch (error: any) {
    console.error("Reset password API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
