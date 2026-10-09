import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ==========================================
// BATAS WAKTU VERCEL — 60 detik
// ==========================================
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // ==========================================
    // 1. CEK TOKEN LOGIN
    // ==========================================
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Anda belum login." },
        { status: 401 }
      );
    }

    const token = authorization.replace("Bearer ", "");

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: "Sesi login tidak valid." },
        { status: 401 }
      );
    }

    // ==========================================
    // 2. CEK ROLE ADMIN
    // ==========================================
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Akses hanya untuk admin." },
        { status: 403 }
      );
    }

    // ==========================================
    // 3. AMBIL KEGIATAN_ID
    // ==========================================
    const body = await request.json();
    const kegiatanId = body.kegiatan_id;

    if (!kegiatanId || typeof kegiatanId !== "string") {
      return NextResponse.json(
        { error: "ID kegiatan wajib dikirim." },
        { status: 400 }
      );
    }

    // ==========================================
    // 4. CEK JUMLAH DATA PENDING
    // ==========================================
    const { count, error: countError } = await supabaseAdmin
      .from("absensi")
      .select("id", { count: "exact", head: true })
      .eq("kegiatan_id", kegiatanId)
      .eq("status", "pending");

    if (countError) {
      console.error("COUNT PENDING ERROR:", countError);

      return NextResponse.json(
        { error: "Gagal memeriksa data absensi pending." },
        { status: 500 }
      );
    }

    const jumlahPending = count ?? 0;

    if (jumlahPending === 0) {
      return NextResponse.json(
        { error: "Tidak ada absensi berstatus pending untuk kegiatan ini." },
        { status: 400 }
      );
    }

    // ==========================================
    // 5. UPDATE SEMUA PENDING JADI VERIFIED
    // ==========================================
    const { error: updateError } = await supabaseAdmin
      .from("absensi")
      .update({
        status: "verified",
        diverifikasi_at: new Date().toISOString(),
        diverifikasi_by: user.id,
      })
      .eq("kegiatan_id", kegiatanId)
      .eq("status", "pending");

    if (updateError) {
      console.error(
        "VERIFIKASI SEMUA ERROR:",
        updateError
      );

      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${jumlahPending} absensi berhasil diverifikasi.`,
      jumlah: jumlahPending,
    });
  } catch (error) {
    console.error(
      "VERIFIKASI SEMUA API ERROR:",
      error
    );

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}