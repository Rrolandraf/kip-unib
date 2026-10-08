"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Mahasiswa = {
  id: string;
  nama: string;
  npm: string;
  fakultas: string | null;
  prodi: string | null;
  angkatan: number | null;
  nama_beasiswa: string | null;
  keterangan: string | null;
};

type Berita = {
  id: string;
  judul: string;
  isi: string;
  created_at: string;
};

export default function DashboardMahasiswa() {
  const router = useRouter();

  const [mahasiswa, setMahasiswa] =
    useState<Mahasiswa | null>(null);

  const [loading, setLoading] = useState(true);
  const [kegiatan, setKegiatan] = useState<any[]>([]);
  const [berita, setBerita] = useState<Berita[]>([]);
  const [absensiMap, setAbsensiMap] = useState<
    Record<string, string>
  >({});
  const [sekarang, setSekarang] = useState(new Date());

  function hitungCountdown(deadline: string) {
    const selisih =
      new Date(deadline).getTime() - sekarang.getTime();

    if (selisih <= 0) {
      return "Deadline telah berakhir";
    }

    const totalDetik = Math.floor(selisih / 1000);

    const hari = Math.floor(totalDetik / 86400);
    const jam = Math.floor((totalDetik % 86400) / 3600);
    const menit = Math.floor((totalDetik % 3600) / 60);
    const detik = totalDetik % 60;

    if (hari > 0) {
      return `${hari} hari ${jam} jam ${menit} menit ${detik} detik`;
    }

    if (jam > 0) {
      return `${jam} jam ${menit} menit ${detik} detik`;
    }

    return `${menit} menit ${detik} detik`;
  }

  function statusAbsensiLabel(status: string) {
    if (status === "pending") {
      return "Menunggu Verifikasi";
    }

    if (status === "verified") {
      return "Terverifikasi";
    }

    if (status === "rejected") {
      return "Ditolak";
    }

    return status;
  }

  function statusAbsensiBadge(status: string) {
    if (status === "pending") {
      return "bg-amber-50 text-amber-700 border border-amber-200";
    }

    if (status === "verified") {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }

    if (status === "rejected") {
      return "bg-red-50 text-red-700 border border-red-200";
    }

    return "bg-slate-100 text-slate-700 border border-slate-200";
  }

  function formatTanggalBerita(tanggal: string) {
    return new Date(tanggal).toLocaleString("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
    });
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setSekarang(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("mahasiswa")
        .select(
          "id, nama, npm, fakultas, prodi, angkatan, nama_beasiswa, keterangan, must_change_password"
        )
        .eq("profile_id", session.user.id)
        .single();

      if (error || !data) {
        console.error(
          "ERROR DATA MAHASISWA:",
          error?.message,
          error?.details,
          error?.hint
        );
        setLoading(false);
        return;
      }

      if (data.must_change_password) {
        router.push("/ubah-password");
        return;
      }

      setMahasiswa(data);

      const {
        data: kegiatanData,
        error: kegiatanError,
      } = await supabase
        .from("kegiatan")
        .select("id, judul, deskripsi, deadline, status")
        .eq("status", "active")
        .order("deadline", { ascending: true });

      if (kegiatanError) {
        console.error(
          "GAGAL MENGAMBIL KEGIATAN:",
          kegiatanError
        );
      } else {
        const listKegiatan = kegiatanData || [];
        setKegiatan(listKegiatan);

        if (listKegiatan.length > 0) {
          const kegiatanIds = listKegiatan.map((k) => k.id);

          const { data: absensiData, error: absensiError } =
            await supabase
              .from("absensi")
              .select("kegiatan_id, status")
              .eq("mahasiswa_id", data.id)
              .in("kegiatan_id", kegiatanIds);

          if (absensiError) {
            console.error(
              "GAGAL MENGAMBIL ABSENSI MAHASISWA:",
              absensiError
            );
          } else {
            const map: Record<string, string> = {};

            (absensiData || []).forEach((a) => {
              map[a.kegiatan_id] = a.status;
            });

            setAbsensiMap(map);
          }
        }
      }

      const {
        data: beritaData,
        error: beritaError,
      } = await supabase
        .from("berita")
        .select("id, judul, isi, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (beritaError) {
        console.error(
          "GAGAL MENGAMBIL BERITA:",
          beritaError
        );
      } else {
        setBerita(beritaData || []);
      }

      setLoading(false);
    }

    loadData();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="animate-spin w-8 h-8 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>

          <p className="text-slate-600 text-sm">
            Memuat dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (!mahasiswa) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-6">
        <div className="text-center bg-white rounded-2xl shadow-xl border border-slate-100 p-8 max-w-sm w-full">
          <h1 className="text-xl font-bold text-slate-800">
            Data mahasiswa tidak ditemukan
          </h1>

          <button
            onClick={handleLogout}
            className="mt-5 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
          >
            Kembali ke Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 via-blue-700 to-indigo-700 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center p-1.5">
              <img
                src="/logo-unib.png"
                alt="Logo UNIB"
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                KIP Kuliah Universitas Bengkulu
              </h1>

              <p className="text-xs text-blue-100 mt-0.5">
                Dashboard Mahasiswa
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="bg-white/15 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium
                       transition-all duration-200
                       hover:bg-white hover:text-blue-700 hover:-translate-y-0.5 hover:shadow-lg"
          >
            Keluar
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Sambutan */}
        <section
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
          style={{ animation: "fadeInUp 0.4s ease-out" }}
        >
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Selamat datang, {mahasiswa.nama}
          </h2>

          <p className="text-slate-500 mt-1 text-sm">
            Berikut informasi akun KIP Kuliah Anda.
          </p>
        </section>

        {/* Profil + Kegiatan */}
        <section className="grid md:grid-cols-2 gap-6">
          {/* Profil */}
          <div
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 transition-shadow duration-300 hover:shadow-md"
            style={{ animation: "fadeInUp 0.5s ease-out" }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>

              <h2 className="text-lg font-bold text-slate-800">
                Profil Mahasiswa
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  NPM
                </p>
                <p className="font-medium text-slate-800 mt-1 font-mono">
                  {mahasiswa.npm}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Nama
                </p>
                <p className="font-medium text-slate-800 mt-1">
                  {mahasiswa.nama}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Fakultas
                </p>
                <p className="font-medium text-slate-800 mt-1">
                  {mahasiswa.fakultas || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Program Studi
                </p>
                <p className="font-medium text-slate-800 mt-1">
                  {mahasiswa.prodi || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Angkatan
                </p>
                <p className="font-medium text-slate-800 mt-1">
                  {mahasiswa.angkatan || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Nama Beasiswa
                </p>

                {mahasiswa.nama_beasiswa ? (
                  <span className="inline-block bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-sm font-medium mt-1.5">
                    {mahasiswa.nama_beasiswa}
                  </span>
                ) : (
                  <p className="font-medium text-slate-800 mt-1">
                    -
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Keterangan
                </p>

                {mahasiswa.keterangan ? (
                  <p className="text-sm text-slate-700 whitespace-pre-line mt-1 leading-relaxed">
                    {mahasiswa.keterangan}
                  </p>
                ) : (
                  <p className="font-medium text-slate-800 mt-1">
                    -
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Kegiatan */}
          <div
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 transition-shadow duration-300 hover:shadow-md"
            style={{ animation: "fadeInUp 0.6s ease-out" }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>

              <h2 className="text-lg font-bold text-slate-800">
                Kegiatan
              </h2>
            </div>

            {kegiatan.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center">
                <p className="text-slate-500 text-sm">
                  Belum ada kegiatan aktif.
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  Kegiatan dan absensi akan tampil di sini.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {kegiatan.map((item) => {
                  const statusAbsen = absensiMap[item.id];

                  return (
                    <div
                      key={item.id}
                      className="border border-slate-200 rounded-xl p-5 transition-all duration-300 hover:border-blue-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-base font-bold text-slate-800">
                          {item.judul}
                        </h3>

                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Aktif
                        </span>
                      </div>

                      {item.deskripsi && (
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {item.deskripsi}
                        </p>
                      )}

                      <div className="mt-4">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Deadline
                        </p>

                        <p className="font-medium text-slate-800 text-sm mt-1">
                          {new Date(
                            item.deadline
                          ).toLocaleString("id-ID")}
                        </p>
                      </div>

                      <div className="mt-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Waktu tersisa
                        </p>

                        <p className="text-base font-bold text-blue-700 mt-1 tabular-nums">
                          {hitungCountdown(item.deadline)}
                        </p>
                      </div>

                      {statusAbsen ? (
                        <div className="mt-4">
                          <span
                            className={`inline-block px-3 py-1.5 rounded-full text-sm font-medium ${statusAbsensiBadge(
                              statusAbsen
                            )}`}
                          >
                            {statusAbsensiLabel(statusAbsen)}
                          </span>
                        </div>
                      ) : (
                        new Date(item.deadline).getTime() >
                          sekarang.getTime() && (
                          <button
                            onClick={() =>
                              router.push(
                                `/absensi/${item.id}`
                              )
                            }
                            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-xl font-semibold text-sm
                                       shadow-md shadow-blue-200
                                       transition-all duration-200
                                       hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-300
                                       active:translate-y-0"
                          >
                            Absensi Sekarang
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Berita & Pengumuman */}
        <section
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
          style={{ animation: "fadeInUp 0.7s ease-out" }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                />
              </svg>
            </div>

            <h2 className="text-lg font-bold text-slate-800">
              Berita & Pengumuman
            </h2>
          </div>

          {berita.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center">
              <p className="text-slate-500 text-sm">
                Belum ada berita atau pengumuman.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {berita.map((item) => (
                <div
                  key={item.id}
                  className="border border-slate-200 rounded-xl p-5 transition-all duration-300 hover:border-amber-200 hover:shadow-md"
                >
                  <h3 className="text-base font-bold text-slate-800">
                    {item.judul}
                  </h3>

                  <p className="text-xs text-slate-400 mt-1">
                    {formatTanggalBerita(item.created_at)}
                  </p>

                  <p className="text-sm text-slate-700 mt-3 whitespace-pre-line leading-relaxed">
                    {item.isi}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}