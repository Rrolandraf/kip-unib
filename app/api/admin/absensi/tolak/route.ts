import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
        {
          error:
            "Akses ditolak. Hanya admin yang dapat menolak absensi.",
        },
        { status: 403 }
      );
    }

    // ==========================================
    // 3. AMBIL ID ABSENSI
    // ==========================================
    const body = await request.json();
    const attendanceId = body.attendance_id;

    if (!attendanceId || typeof attendanceId !== "string") {
      return NextResponse.json(
        { error: "ID absensi wajib dikirim." },
        { status: 400 }
      );
    }

    // ==========================================
    // 4. PASTIKAN DATA ABSENSI ADA
    // ==========================================
    const { data: absensi, error: absensiError } =
      await supabaseAdmin
        .from("absensi")
        .select("id, status")
        .eq("id", attendanceId)
        .single();

    if (absensiError || !absensi) {
      return NextResponse.json(
        { error: "Data absensi tidak ditemukan." },
        { status: 404 }
      );
    }

    // ==========================================
    // 5. TOLAK JIKA SUDAH BERSTATUS rejected
    // ==========================================
    if (absensi.status === "rejected") {
      return NextResponse.json(
        {
          error: "Absensi ini sudah berstatus ditolak.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 6. UPDATE STATUS = rejected
    // ==========================================
    const { data, error: updateError } =
      await supabaseAdmin
        .from("absensi")
        .update({
          status: "rejected",
          diverifikasi_at: new Date().toISOString(),
          diverifikasi_by: user.id,
        })
        .eq("id", attendanceId)
        .select()
        .single();

    if (updateError) {
      console.error("TOLAK ABSENSI ERROR:", updateError);

      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Absensi berhasil ditolak.",
      absensi: data,
    });
  } catch (error) {
    console.error("TOLAK ABSENSI API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}