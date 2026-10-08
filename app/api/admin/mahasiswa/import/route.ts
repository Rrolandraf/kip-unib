import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

type RowInput = {
  npm: string;
  nama: string;
  angkatan: number;
  fakultas: string;
  prodi: string;
  nama_beasiswa: string;
  keterangan: string;
};

// ==========================================
// VALIDASI NIM
// ==========================================
function validasiNim(npm: string): string | null {
  if (!npm) {
    return "NIM kosong.";
  }

  if (npm.length < 3) {
    return "NIM terlalu pendek (minimal 3 karakter).";
  }

  if (npm.length > 30) {
    return "NIM terlalu panjang (maksimal 30 karakter).";
  }

  if (/\s/.test(npm)) {
    return "NIM tidak boleh mengandung spasi.";
  }

  // Hanya huruf, angka, titik, strip, underscore
  if (!/^[A-Za-z0-9._-]+$/.test(npm)) {
    return "NIM hanya boleh huruf, angka, titik, strip, atau underscore.";
  }

  return null;
}

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
    // 2. AMBIL DATA ROWS
    // ==========================================
    const body = await request.json();
    const rows: RowInput[] = Array.isArray(body.rows)
      ? body.rows
      : [];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data untuk diimport." },
        { status: 400 }
      );
    }

    // ==========================================
    // 3. PROSES PER BARIS
    // ==========================================
    const detail: {
      baris: number;
      npm: string;
      status: "berhasil" | "gagal";
      alasan?: string;
    }[] = [];

    let berhasil = 0;
    let gagal = 0;

    for (let i = 0; i < rows.length; i++) {
      const baris = i + 1;
      const row = rows[i];

      const npm = String(row.npm ?? "").trim();
      const nama = String(row.nama ?? "").trim();
      const angkatan = Number(row.angkatan);
      const fakultas = String(row.fakultas ?? "").trim();
      const prodi = String(row.prodi ?? "").trim();
      const namaBeasiswa = String(
        row.nama_beasiswa ?? ""
      ).trim();
      const keterangan = String(row.keterangan ?? "").trim();

      // -----------------------------------------
      // Validasi NIM
      // -----------------------------------------
      const nimError = validasiNim(npm);

      if (nimError) {
        gagal++;
        detail.push({
          baris,
          npm,
          status: "gagal",
          alasan: nimError,
        });
        continue;
      }

      // -----------------------------------------
      // Validasi Nama
      // -----------------------------------------
      if (!nama) {
        gagal++;
        detail.push({
          baris,
          npm,
          status: "gagal",
          alasan: "Nama kosong.",
        });
        continue;
      }

      if (nama.length < 2) {
        gagal++;
        detail.push({
          baris,
          npm,
          status: "gagal",
          alasan: "Nama terlalu pendek.",
        });
        continue;
      }

      // -----------------------------------------
      // Validasi Angkatan
      // -----------------------------------------
      if (!Number.isInteger(angkatan)) {
        gagal++;
        detail.push({
          baris,
          npm,
          status: "gagal",
          alasan: "Angkatan bukan angka yang valid.",
        });
        continue;
      }

      if (angkatan < 2000 || angkatan > 2100) {
        gagal++;
        detail.push({
          baris,
          npm,
          status: "gagal",
          alasan:
            "Angkatan tidak wajar (harus antara 2000 dan 2100).",
        });
        continue;
      }

      // -----------------------------------------
      // Cek duplikat NPM
      // -----------------------------------------
      const { data: existing } = await supabaseAdmin
        .from("mahasiswa")
        .select("id")
        .eq("npm", npm)
        .maybeSingle();

      if (existing) {
        gagal++;
        detail.push({
          baris,
          npm,
          status: "gagal",
          alasan: "NIM sudah terdaftar.",
        });
        continue;
      }

      // -----------------------------------------
      // Buat user Auth
      // -----------------------------------------
      const email = `${npm.toLowerCase()}@kip.unib.ac.id`;

      const { data: newUserData, error: createUserError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: "812800",
          email_confirm: true,
        });

      if (createUserError || !newUserData.user) {
        gagal++;
        detail.push({
          baris,
          npm,
          status: "gagal",
          alasan:
            createUserError?.message ||
            "Gagal membuat akun Auth.",
        });
        continue;
      }

      const profileId = newUserData.user.id;

      // -----------------------------------------
      // Insert mahasiswa
      // -----------------------------------------
      const { error: insertError } = await supabaseAdmin
        .from("mahasiswa")
        .insert({
          profile_id: profileId,
          npm,
          nama,
          fakultas: fakultas || null,
          prodi: prodi || null,
          angkatan,
          nama_beasiswa: namaBeasiswa || null,
          keterangan: keterangan || null,
          must_change_password: true,
        });

      if (insertError) {
        // Rollback: hapus user Auth
        await supabaseAdmin.auth.admin.deleteUser(profileId);

        gagal++;
        detail.push({
          baris,
          npm,
          status: "gagal",
          alasan: insertError.message,
        });
        continue;
      }

      berhasil++;
      detail.push({ baris, npm, status: "berhasil" });
    }

    return NextResponse.json({
      success: true,
      berhasil,
      gagal,
      detail,
    });
  } catch (error) {
    console.error("IMPORT MAHASISWA ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}