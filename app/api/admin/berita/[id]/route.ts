import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ==========================================
// HELPER: CEK ADMIN
// ==========================================
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

  const { data: profile, error: profileError } = await supabaseAdmin
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