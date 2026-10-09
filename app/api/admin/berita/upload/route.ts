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
    // 1. CEK TOKEN ADMIN
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
    // 2. AMBIL FILE DARI FORMDATA
    // ==========================================
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File wajib diupload." },
        { status: 400 }
      );
    }

    // ==========================================
    // 3. VALIDASI TIPE FILE
    // ==========================================
    const tipe = file.type;

    let lampiranTipe: "gambar" | "pdf" | null = null;

    if (tipe.startsWith("image/")) {
      lampiranTipe = "gambar";
    } else if (tipe === "application/pdf") {
      lampiranTipe = "pdf";
    } else {
      return NextResponse.json(
        {
          error:
            "File harus berupa gambar (JPG/PNG) atau PDF.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 4. VALIDASI UKURAN FILE
    // ==========================================
    const MaksGambar = 4 * 1024 * 1024; // 4 MB
    const MaksPdf = 8 * 1024 * 1024; // 8 MB

    const maks =
      lampiranTipe === "gambar" ? MaksGambar : MaksPdf;

    if (file.size > maks) {
      return NextResponse.json(
        {
          error:
            lampiranTipe === "gambar"
              ? "Ukuran gambar maksimal 4 MB."
              : "Ukuran PDF maksimal 8 MB.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 5. UPLOAD KE SUPABASE STORAGE
    // ==========================================
    const ekstensi =
      file.name.split(".").pop()?.toLowerCase() || "bin";

    const namaFile = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}.${ekstensi}`;

    const filePath = namaFile;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("berita")
      .upload(filePath, buffer, {
        contentType: tipe,
        upsert: false,
      });

    if (uploadError) {
      console.error("UPLOAD BERITA ERROR:", uploadError);

      return NextResponse.json(
        { error: "Gagal mengupload file." },
        { status: 500 }
      );
    }

    // ==========================================
    // 6. BUAT URL PUBLIK
    // ==========================================
    const { data: publicUrlData } = supabaseAdmin.storage
      .from("berita")
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      lampiran_url: publicUrlData.publicUrl,
      lampiran_tipe: lampiranTipe,
      lampiran_nama: file.name,
      lampiran_path: filePath,
    });
  } catch (error) {
    console.error("UPLOAD LAMPIRAN API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}