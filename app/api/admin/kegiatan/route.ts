import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export async function POST(request: Request) {
  try {
    // 1. Periksa token login
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Tidak terautentikasi." },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // 2. Validasi token ke Supabase
    const { data: userData, error: userError } =
      await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: "Session tidak valid." },
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    // 3. Periksa apakah user adalah admin
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "admin"
    ) {
      return NextResponse.json(
        { error: "Akses hanya untuk admin." },
        { status: 403 }
      );
    }

    // 4. Ambil data dari form
    const body = await request.json();

    const nama = body.nama?.trim();
    const deskripsi = body.deskripsi?.trim() || null;
    const deadline = body.deadline;

    // 5. Validasi data
    if (!nama) {
      return NextResponse.json(
        { error: "Nama kegiatan wajib diisi." },
        { status: 400 }
      );
    }

    if (!deadline) {
      return NextResponse.json(
        { error: "Deadline wajib diisi." },
        { status: 400 }
      );
    }

    // 6. Simpan kegiatan
   const { data: kegiatan, error: kegiatanError } =
  await supabaseAdmin
    .from("kegiatan")
    .insert({
      judul: nama,
      deskripsi,
      deadline: new Date(deadline).toISOString(),
      status: "active",
      created_by: userId,
    })
    .select()
    .single();

 if (kegiatanError) {
  console.error(
    "INSERT KEGIATAN ERROR:",
    kegiatanError
  );

  return NextResponse.json(
    {
      error: kegiatanError.message,
    },
    { status: 500 }
  );
}

    return NextResponse.json({
      message: "Kegiatan berhasil ditambahkan.",
      kegiatan,
    });
  } catch (error) {
    console.error(
      "CREATE KEGIATAN ERROR:",
      error
    );

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}