import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // 1. CEK TOKEN ADMIN
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Anda belum login." }, { status: 401 });
    }

    const token = authorization.replace("Bearer ", "");
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: "Sesi login tidak valid." }, { status: 401 });
    }

    // 2. CEK ROLE ADMIN
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Akses ditolak. Hanya admin." }, { status: 403 });
    }

    // 3. AMBIL DATA DARI BODY
    const body = await request.json();
    const { ids, action } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Tidak ada ID absensi yang dipilih." }, { status: 400 });
    }

    if (action !== "verified" && action !== "rejected") {
      return NextResponse.json({ error: "Aksi tidak valid. Gunakan 'verified' atau 'rejected'." }, { status: 400 });
    }

    // 4. UPDATE MASSAL
    // Kita gunakan .in("id", ids) untuk update banyak sekaligus
    const { error: updateError } = await supabaseAdmin
      .from("absensi")
      .update({
        status: action,
        diverifikasi_at: new Date().toISOString(),
        diverifikasi_by: user.id,
      })
      .in("id", ids);

    if (updateError) {
      console.error("BATCH UPDATE ERROR:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${ids.length} absensi berhasil diubah menjadi ${action}.`,
    });
  } catch (error) {
    console.error("BATCH API ERROR:", error);
    return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}