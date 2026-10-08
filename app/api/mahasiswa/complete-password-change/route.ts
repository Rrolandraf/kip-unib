import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Tidak terautentikasi." },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } =
      await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json(
        { error: "Session tidak valid." },
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    const { data: mahasiswa, error: mahasiswaError } =
      await supabaseAdmin
        .from("mahasiswa")
        .select("id")
        .eq("profile_id", userId)
        .single();

    if (mahasiswaError || !mahasiswa) {
      return NextResponse.json(
        { error: "Data mahasiswa tidak ditemukan." },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("mahasiswa")
      .update({
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mahasiswa.id);

    if (updateError) {
      console.error("UPDATE MAHASISWA ERROR:", updateError);

      return NextResponse.json(
        { error: "Gagal memperbarui status password." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Password berhasil diperbarui.",
    });
  } catch (error) {
    console.error("COMPLETE PASSWORD ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}