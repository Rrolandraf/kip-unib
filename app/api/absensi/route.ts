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
    // 2. CARI DATA MAHASISWA
    // ==========================================
    const { data: mahasiswa, error: mahasiswaError } =
      await supabaseAdmin
        .from("mahasiswa")
        .select("id, nama, npm")
        .eq("profile_id", user.id)
        .single();

    if (mahasiswaError || !mahasiswa) {
      console.error("MAHASISWA ERROR:", mahasiswaError);

      return NextResponse.json(
        { error: "Data mahasiswa tidak ditemukan." },
        { status: 404 }
      );
    }

    // ==========================================
    // 3. AMBIL DATA FORM
    // ==========================================
    const formData = await request.formData();

    const kegiatanId = formData.get("kegiatan_id");
    const foto = formData.get("foto");
    const konfirmasi = formData.get("konfirmasi");

    if (
      typeof kegiatanId !== "string" ||
      !kegiatanId
    ) {
      return NextResponse.json(
        { error: "ID kegiatan tidak valid." },
        { status: 400 }
      );
    }

    if (!(foto instanceof File)) {
      return NextResponse.json(
        { error: "Foto bukti kehadiran wajib diupload." },
        { status: 400 }
      );
    }

    if (konfirmasi !== "true") {
      return NextResponse.json(
        { error: "Konfirmasi kehadiran wajib dicentang." },
        { status: 400 }
      );
    }

    // ==========================================
    // 4. VALIDASI FILE FOTO
    // ==========================================
    if (!foto.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File harus berupa gambar." },
        { status: 400 }
      );
    }

    const maksimalUkuran = 5 * 1024 * 1024;

    if (foto.size > maksimalUkuran) {
      return NextResponse.json(
        { error: "Ukuran foto maksimal 5 MB." },
        { status: 400 }
      );
    }

    // ==========================================
    // 5. AMBIL DATA KEGIATAN
    // ==========================================
    const { data: kegiatan, error: kegiatanError } =
      await supabaseAdmin
        .from("kegiatan")
        .select("id, judul, deadline, status")
        .eq("id", kegiatanId)
        .single();

    if (kegiatanError || !kegiatan) {
      console.error("KEGIATAN ERROR:", kegiatanError);

      return NextResponse.json(
        { error: "Kegiatan tidak ditemukan." },
        { status: 404 }
      );
    }

    // ==========================================
    // 6. CEK STATUS KEGIATAN
    // ==========================================
    if (kegiatan.status !== "active") {
      return NextResponse.json(
        { error: "Kegiatan ini sudah tidak aktif." },
        { status: 400 }
      );
    }

    // ==========================================
    // 7. CEK DEADLINE DI SERVER
    // ==========================================
    const sekarang = new Date();
    const deadline = new Date(kegiatan.deadline);

    if (sekarang.getTime() >= deadline.getTime()) {
      return NextResponse.json(
        { error: "Deadline absensi telah berakhir." },
        { status: 400 }
      );
    }

    // ==========================================
    // 8. CEK APAKAH SUDAH PERNAH ABSEN
    // ==========================================
    const { data: absensiLama, error: absensiCheckError } =
      await supabaseAdmin
        .from("absensi")
        .select("id, status")
        .eq("mahasiswa_id", mahasiswa.id)
        .eq("kegiatan_id", kegiatanId)
        .maybeSingle();

    if (absensiCheckError) {
      console.error(
        "CEK ABSENSI ERROR:",
        absensiCheckError
      );

      return NextResponse.json(
        { error: "Gagal memeriksa data absensi." },
        { status: 500 }
      );
    }

    if (absensiLama) {
      return NextResponse.json(
        {
          error:
            "Anda sudah mengirim absensi untuk kegiatan ini.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // 9. BUAT NAMA FILE
    // ==========================================
    const ekstensi =
      foto.name.split(".").pop()?.toLowerCase() || "jpg";

    const namaFile = `${mahasiswa.npm}-${Date.now()}.${ekstensi}`;

    const filePath = `${kegiatanId}/${mahasiswa.id}/${namaFile}`;

    // ==========================================
    // 10. UPLOAD FOTO KE SUPABASE STORAGE
    // ==========================================
    const arrayBuffer = await foto.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } =
      await supabaseAdmin.storage
        .from("absensi")
        .upload(filePath, buffer, {
          contentType: foto.type,
          upsert: false,
        });

    if (uploadError) {
      console.error("UPLOAD FOTO ERROR:", uploadError);

      return NextResponse.json(
        { error: "Gagal mengupload foto." },
        { status: 500 }
      );
    }

    // ==========================================
    // 11. SIMPAN DATA ABSENSI
    // ==========================================
    const { data: absensi, error: insertError } =
      await supabaseAdmin
        .from("absensi")
        .insert({
          mahasiswa_id: mahasiswa.id,
          kegiatan_id: kegiatanId,
          foto_url: filePath,
          foto_public_id: filePath,
          konfirmasi: true,
          status: "pending",
          waktu_absen: sekarang.toISOString(),
        })
        .select()
        .single();

    if (insertError) {
      console.error(
        "INSERT ABSENSI ERROR:",
        insertError
      );

      // Jika database gagal, hapus foto yang sudah terupload
      await supabaseAdmin.storage
        .from("absensi")
        .remove([filePath]);

      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    // ==========================================
    // 12. BERHASIL
    // ==========================================
    return NextResponse.json({
      success: true,
      message: "Absensi berhasil dikirim.",
      data: absensi,
    });
  } catch (error) {
    console.error("API ABSENSI ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}