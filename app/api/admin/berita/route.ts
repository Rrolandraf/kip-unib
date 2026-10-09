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
    return {
      error: "Akses ditolak. Hanya admin.",
      status: 403,
    } as const;
  }

  return { user } as const;
}

// ==========================================
// GET: LIST SEMUA BERITA (UNTUK ADMIN)
// ==========================================
export async function GET(request: NextRequest) {
  try {
    const cek = await cekAdmin(request);

    if ("error" in cek) {
      return NextResponse.json(
        { error: cek.error },
        { status: cek.status }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("berita")
      .select(
        "id, judul, isi, published, lampiran_url, lampiran_tipe, lampiran_nama, created_at, updated_at, created_by"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("LIST BERITA ERROR:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ berita: data || [] });
  } catch (error) {
    console.error("GET BERITA API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}

// ==========================================
// POST: BUAT BERITA BARU
// ==========================================
export async function POST(request: NextRequest) {
  try {
    const cek = await cekAdmin(request);

    if ("error" in cek) {
      return NextResponse.json(
        { error: cek.error },
        { status: cek.status }
      );
    }

    const body = await request.json();

    const judul = String(body.judul ?? "").trim();
    const isi = String(body.isi ?? "").trim();
    const published = Boolean(body.published ?? false);
    const lampiranUrl = body.lampiran_url
      ? String(body.lampiran_url).trim()
      : null;
    const lampiranTipe = body.lampiran_tipe
      ? String(body.lampiran_tipe).trim()
      : null;
    const lampiranNama = body.lampiran_nama
      ? String(body.lampiran_nama).trim()
      : null;

    if (!judul) {
      return NextResponse.json(
        { error: "Judul berita wajib diisi." },
        { status: 400 }
      );
    }

    if (!isi) {
      return NextResponse.json(
        { error: "Isi berita wajib diisi." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("berita")
      .insert({
        judul,
        isi,
        published,
        lampiran_url: lampiranUrl,
        lampiran_tipe: lampiranTipe,
        lampiran_nama: lampiranNama,
        created_by: cek.user.id,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error("INSERT BERITA ERROR:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, berita: data },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST BERITA API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}