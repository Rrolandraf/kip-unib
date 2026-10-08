import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function cekAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return { error: "Anda belum login.", status: 401 } as const;
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
    return { error: "Sesi login tidak valid.", status: 401 } as const;
  }

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

  if (profileError || !profile || profile.role !== "admin") {
    return { error: "Akses hanya untuk admin.", status: 403 } as const;
  }

  return { user } as const;
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const cek = await cekAdmin(request);

    if ("error" in cek) {
      return NextResponse.json(
        { error: cek.error },
        { status: cek.status }
      );
    }

    // ==========================================
    // 1. Pastikan kegiatan ada
    // ==========================================
    const { data: kegiatan, error: getError } =
      await supabaseAdmin
        .from("kegiatan")
        .select("id, judul")
        .eq("id", id)
        .single();

    if (getError || !kegiatan) {
      return NextResponse.json(
        { error: "Kegiatan tidak ditemukan." },
        { status: 404 }
      );
    }

    // ==========================================
    // 2. Ambil semua absensi terkait (untuk hapus foto)
    // ==========================================
    const { data: absensiList, error: absensiError } =
      await supabaseAdmin
        .from("absensi")
        .select("id, foto_url")
        .eq("kegiatan_id", id);

    if (absensiError) {
      console.error(
        "AMBIL ABSENSI TERKAIT ERROR:",
        absensiError
      );

      return NextResponse.json(
        { error: "Gagal mengambil data absensi terkait." },
        { status: 500 }
      );
    }

    const daftarAbsensi = absensiList || [];
    const jumlahAbsensi = daftarAbsensi.length;

    // ==========================================
    // 3. Hapus foto absensi di Supabase Storage
    // ==========================================
    if (jumlahAbsensi > 0) {
      const paths = daftarAbsensi
        .map((a) => a.foto_url)
        .filter(
          (p): p is string =>
            typeof p === "string" && p.length > 0
        );

      if (paths.length > 0) {
        const { error: storageError } =
          await supabaseAdmin.storage
            .from("absensi")
            .remove(paths);

        if (storageError) {
          // Tidak fatal — lanjut hapus database
          console.error(
            "HAPUS FOTO STORAGE ERROR:",
            storageError
          );
        }
      }
    }

    // ==========================================
    // 4. Hapus baris absensi terkait
    // ==========================================
    if (jumlahAbsensi > 0) {
      const { error: deleteAbsensiError } =
        await supabaseAdmin
          .from("absensi")
          .delete()
          .eq("kegiatan_id", id);

      if (deleteAbsensiError) {
        console.error(
          "HAPUS ABSENSI ERROR:",
          deleteAbsensiError
        );

        return NextResponse.json(
          {
            error:
              "Gagal menghapus data absensi terkait: " +
              deleteAbsensiError.message,
          },
          { status: 500 }
        );
      }
    }

    // ==========================================
    // 5. Hapus kegiatan
    // ==========================================
    const { error: deleteKegiatanError } =
      await supabaseAdmin
        .from("kegiatan")
        .delete()
        .eq("id", id);

    if (deleteKegiatanError) {
      console.error(
        "DELETE KEGIATAN ERROR:",
        deleteKegiatanError
      );

      return NextResponse.json(
        { error: deleteKegiatanError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        jumlahAbsensi > 0
          ? `Kegiatan "${kegiatan.judul}" berhasil dihapus beserta ${jumlahAbsensi} data absensi terkait.`
          : `Kegiatan "${kegiatan.judul}" berhasil dihapus.`,
      jumlahAbsensiTerhapus: jumlahAbsensi,
    });
  } catch (error) {
    console.error("DELETE KEGIATAN API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}