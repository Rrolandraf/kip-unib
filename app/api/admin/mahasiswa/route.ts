import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

async function cekAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return { error: "Anda belum login.", status: 401 } as const;
  }

  const token = authorization.replace("Bearer ", "");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

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
// GET: LIST SEMUA MAHASISWA
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

    const { count, error: countError } = await supabaseAdmin
      .from("mahasiswa")
      .select("id", { count: "exact", head: true });

    if (countError) {
      console.error("COUNT MAHASISWA ERROR:", countError);
    }

    const total = count ?? 0;
    const BATCH_SIZE = 1000;
    const semuaData: any[] = [];

    const jumlahBatch = Math.max(
      1,
      Math.ceil(total / BATCH_SIZE)
    );

    for (let i = 0; i < jumlahBatch; i++) {
      const from = i * BATCH_SIZE;
      const to = from + BATCH_SIZE - 1;

      const { data, error } = await supabaseAdmin
        .from("mahasiswa")
        .select(
          "id, nama, npm, fakultas, prodi, angkatan, nama_beasiswa, keterangan, must_change_password"
        )
        .range(from, to)
        .order("nama", { ascending: true });

      if (error) {
        console.error(
          `LIST MAHASISWA BATCH ${i} ERROR:`,
          error
        );

        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      if (data) {
        semuaData.push(...data);
      }

      if (!data || data.length < BATCH_SIZE) {
        break;
      }
    }

    return NextResponse.json({
      mahasiswa: semuaData,
      total: total || semuaData.length,
    });
  } catch (error) {
    console.error("GET MAHASISWA API ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}

// ==========================================
// POST: TAMBAH SATU MAHASISWA
// ==========================================
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

    const adminId = userData.user.id;

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", adminId)
        .single();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Akses hanya untuk admin." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const npm = String(body.npm ?? "").trim();
    const nama = String(body.nama ?? "").trim();
    const fakultas = String(body.fakultas ?? "").trim();
    const prodi = String(body.prodi ?? "").trim();
    const angkatan = Number(body.angkatan);

    if (!npm || !nama) {
      return NextResponse.json(
        { error: "NPM dan nama wajib diisi." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(angkatan)) {
      return NextResponse.json(
        { error: "Angkatan harus berupa angka." },
        { status: 400 }
      );
    }

    const { data: existingMahasiswa } =
      await supabaseAdmin
        .from("mahasiswa")
        .select("id")
        .eq("npm", npm)
        .maybeSingle();

    if (existingMahasiswa) {
      return NextResponse.json(
        { error: "NPM tersebut sudah terdaftar." },
        { status: 409 }
      );
    }

    const email = `${npm}@kip.unib.ac.id`;

    const { data: newUserData, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: "812800",
        email_confirm: true,
      });

    if (createUserError || !newUserData.user) {
      return NextResponse.json(
        {
          error:
            createUserError?.message ??
            "Gagal membuat akun mahasiswa.",
        },
        { status: 400 }
      );
    }

    const profileId = newUserData.user.id;

    const { data: mahasiswa, error: mahasiswaError } =
      await supabaseAdmin
        .from("mahasiswa")
        .insert({
          profile_id: profileId,
          npm,
          nama,
          fakultas: fakultas || null,
          prodi: prodi || null,
          angkatan,
          must_change_password: true,
        })
        .select()
        .single();

    if (mahasiswaError) {
      await supabaseAdmin.auth.admin.deleteUser(profileId);

      return NextResponse.json(
        {
          error:
            "Gagal menyimpan data mahasiswa: " +
            mahasiswaError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Mahasiswa berhasil ditambahkan.",
        mahasiswa,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("ADMIN MAHASISWA ERROR:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}