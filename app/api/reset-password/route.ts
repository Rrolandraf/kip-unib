import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    // Cek token admin
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

    // Pastikan yang melakukan reset adalah admin
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya admin yang dapat mereset password." },
        { status: 403 }
      );
    }

    // Ambil NPM mahasiswa
    const body = await request.json();
    const npm = body.npm;

    if (!npm || typeof npm !== "string") {
      return NextResponse.json(
        { error: "NPM mahasiswa wajib diisi." },
        { status: 400 }
      );
    }

    // Cari mahasiswa
    const { data: mahasiswa, error: mahasiswaError } =
      await supabaseAdmin
        .from("mahasiswa")
        .select("id, npm, nama, profile_id")
        .eq("npm", npm.trim())
        .single();

    if (mahasiswaError || !mahasiswa) {
      return NextResponse.json(
        { error: "Mahasiswa tidak ditemukan." },
        { status: 404 }
      );
    }

    if (!mahasiswa.profile_id) {
      return NextResponse.json(
        { error: "Akun login mahasiswa belum tersedia." },
        { status: 400 }
      );
    }

    // Password baru sementara
    const passwordBaru = "812800";

    // Reset password Auth
    const { error: updateAuthError } =
      await supabaseAdmin.auth.admin.updateUserById(
        mahasiswa.profile_id,
        {
          password: passwordBaru,
        }
      );

    if (updateAuthError) {
      console.error(
        "RESET PASSWORD ERROR:",
        updateAuthError
      );

      return NextResponse.json(
        { error: updateAuthError.message },
        { status: 500 }
      );
    }

    // Wajib mengganti password setelah login
    const { error: updateMahasiswaError } =
      await supabaseAdmin
        .from("mahasiswa")
        .update({
          must_change_password: true,
        })
        .eq("id", mahasiswa.id);

    if (updateMahasiswaError) {
      console.error(
        "UPDATE MAHASISWA ERROR:",
        updateMahasiswaError
      );

      return NextResponse.json(
        {
          error:
            "Password berhasil direset, tetapi status wajib ganti password gagal diperbarui.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password mahasiswa berhasil direset.",
      mahasiswa: {
        nama: mahasiswa.nama,
        npm: mahasiswa.npm,
      },
      passwordSementara: passwordBaru,
    });
  } catch (error) {
    console.error("RESET PASSWORD API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}