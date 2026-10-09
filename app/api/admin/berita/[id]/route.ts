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
// HELPER: EKSTRAK PATH FILE DARI URL PUBLIK
// ==========================================
function ekstrakPathDariUrl(url: string): string | null {
  try {
    // Format URL: https://xxx.supabase.co/storage/v1/object/public/berita/<path>
    const marker = "/storage/v1/object/public/berita/";
    const idx = url.indexOf(marker);

    if (idx === -1) return null;

    return url.substring(idx + marker.length);
  } catch {
    return null;
  }
}

// ==========================================
// PUT: UPDATE BERITA
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

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.judul !== undefined) {
      const judul = String(body.judul).trim();

      if (!judul) {
        return NextResponse.json(
          { error: "Judul berita tidak boleh kosong." },
          { status: 400 }
        );
      }

      updates.judul = judul;
    }

    if (body.isi !== undefined) {
      const isi = String(body.isi).trim();

      if (!isi) {
        return NextResponse.json(
          { error: "Isi berita tidak boleh kosong." },
          { status: 400 }
        );
      }

      updates.isi = isi;
    }

    if (body.published !== undefined) {
      updates.published = Boolean(body.published);
    }

    // Lampiran
    if (body.lampiran_url !== undefined) {
      updates.lampiran_url = body.lampiran_url
        ? String(body.lampiran_url).trim()
        : null;
    }

    if (body.lampiran_tipe !== undefined) {
      updates.lampiran_tipe = body.lampiran_tipe
        ? String(body.lampiran_tipe).trim()
        : null;
    }

    if (body.lampiran_nama !== undefined) {
      updates.lampiran_nama = body.lampiran_nama
        ? String(body.lampiran_nama).trim()
        : null;
    }

    // ==========================================
    // KALAU GANTI LAMPIRAN, HAPUS FILE LAMA
    // ==========================================
    if (body.hapus_lampiran_lama && body.lampiran_lama_url) {
      const pathLama = ekstrakPathDariUrl(
        String(body.lampiran_lama_url)
      );

      if (pathLama) {
        await supabaseAdmin.storage
          .from("berita")
          .remove([pathLama])
          .catch((err) =>
            console.error("HAPUS FILE LAMA ERROR:", err)
          );
      }
    }

    const { data, error } = await supabaseAdmin
      .from("berita")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("UPDATE BERITA ERROR:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, berita: data });
  } catch (error) {
    console.error("PUT BERITA API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}

// ==========================================
// DELETE: HAPUS BERITA
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

    // Ambil lampiran_url dulu
    const { data: berita } = await supabaseAdmin
      .from("berita")
      .select("lampiran_url")
      .eq("id", id)
      .single();

    // Hapus file lampiran kalau ada
    if (berita?.lampiran_url) {
      const path = ekstrakPathDariUrl(berita.lampiran_url);

      if (path) {
        await supabaseAdmin.storage
          .from("berita")
          .remove([path])
          .catch((err) =>
            console.error("HAPUS FILE BERITA ERROR:", err)
          );
      }
    }

    // Hapus baris berita
    const { error } = await supabaseAdmin
      .from("berita")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("DELETE BERITA ERROR:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE BERITA API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}