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

// ==========================================
// PUT: EDIT KEGIATAN
// ==========================================
export async function PUT(
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

    const body = await request.json();
    const nama = body.nama?.trim();
    const deskripsi = body.deskripsi?.trim() || null;
    const deadline = body.deadline;
    const absenMulai = body.absen_mulai || null;

    if (!nama) {
      return NextResponse.json(
        { error: "Nama kegiatan wajib diisi." },
        { status: 400 }
      );
    }

    if (!deadline) {
      return NextResponse.json(
        { error: "Batas akhir absen wajib diisi." },
        { status: 400 }
      );
    }

    if (absenMulai) {
      const tglMulai = new Date(absenMulai).getTime();
      const tglDeadline = new Date(deadline).getTime();

      if (tglMulai >= tglDeadline) {
        return NextResponse.json(
          { error: "Jam mulai absen harus lebih awal dari batas akhir absen." },
          { status: 400 }
        );
      }
    }

    const { data: kegiatan, error: updateError } =
      await supabaseAdmin
        .from("kegiatan")
        .update({
          judul: nama,
          deskripsi,
          deadline: new Date(deadline).toISOString(),
          absen_mulai: absenMulai ? new Date(absenMulai).toISOString() : null,
        })
        .eq("id", id)
        .select()
        .single();

    if (updateError) {
      console.error("UPDATE KEGIATAN ERROR:", updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Kegiatan berhasil diperbarui.",
      kegiatan,
    });
  } catch (error) {
    console.error("PUT KEGIATAN API ERROR:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}

// ==========================================
// DELETE: HAPUS KEGIATAN (TETAP SEPERTI SEBELUMNYA)
// ==========================================
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

    const { data: absensiList, error: absensiError } =
      await supabaseAdmin
        .from("absensi")
        .select("id, foto_url")
        .eq("kegiatan_id", id);

    if (absensiError) {
      return NextResponse.json(
        { error: "Gagal mengambil data absensi terkait." },
        { status: 500 }
      );
    }

    const daftarAbsensi = absensiList || [];
    const jumlahAbsensi = daftarAbsensi.length;

    if (jumlahAbsensi > 0) {
      const paths = daftarAbsensi
        .map((a) => a.foto_url)
        .filter(
          (p): p is string =>
            typeof p === "string" && p.length > 0
        );

      if (paths.length > 0) {
        await supabaseAdmin.storage
          .from("absensi")
          .remove(paths)
          .catch((err) => console.error("STORAGE ERROR:", err));
      }

      const { error: deleteAbsensiError } =
        await supabaseAdmin
          .from("absensi")
          .delete()
          .eq("kegiatan_id", id);

      if (deleteAbsensiError) {
        return NextResponse.json(
          { error: "Gagal menghapus data absensi terkait: " + deleteAbsensiError.message },
          { status: 500 }
        );
      }
    }

    const { error: deleteKegiatanError } =
      await supabaseAdmin
        .from("kegiatan")
        .delete()
        .eq("id", id);

    if (deleteKegiatanError) {
      return NextResponse.json(
        { error: deleteKegiatanError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Kegiatan "${kegiatan.judul}" berhasil dihapus beserta ${jumlahAbsensi} data absensi terkait.`,
    });
  } catch (error) {
    console.error("DELETE KEGIATAN API ERROR:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}