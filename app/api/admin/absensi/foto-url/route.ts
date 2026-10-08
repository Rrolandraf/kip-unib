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

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Akses hanya untuk admin." },
        { status: 403 }
      );
    }

    // ==========================================
    // 3. AMBIL DAFTAR PATH DARI BODY
    // ==========================================
    const body = await request.json();
    const paths: string[] = Array.isArray(body.paths)
      ? body.paths.filter(
          (p: unknown) => typeof p === "string" && p.length > 0
        )
      : [];

    if (paths.length === 0) {
      return NextResponse.json({ urls: {} });
    }

    // ==========================================
    // 4. BUAT SIGNED URL (berlaku 1 jam)
    // ==========================================
    const { data, error } = await supabaseAdmin.storage
      .from("absensi")
      .createSignedUrls(paths, 3600);

    if (error) {
      console.error("SIGNED URL ERROR:", error);

      return NextResponse.json(
        { error: "Gagal membuat URL foto." },
        { status: 500 }
      );
    }

    // ==========================================
    // 5. SUSUN MAP: path -> signedUrl
    // ==========================================
    const urls: Record<string, string> = {};

    (data || []).forEach((item) => {
      if (item.path && item.signedUrl) {
        urls[item.path] = item.signedUrl;
      }
    });

    return NextResponse.json({ urls });
  } catch (error) {
    console.error("FOTO URL ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}