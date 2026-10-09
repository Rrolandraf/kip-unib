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
  lampiran_url: string | null;
  lampiran_tipe: string | null;
  lampiran_nama: string | null;
  created_at: string;
};

// ==========================================
// HOOK: ANIMASI ANGKA NAIK DARI 0
// ==========================================
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }

    let raf: number;
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

export default function DashboardMahasiswa() {
  const router = useRouter();

  const [mahasiswa, setMahasiswa] = useState<Mahasiswa | null>(null);
  const [loading, setLoading] = useState(true);
  const [kegiatan, setKegiatan] = useState<any[]>([]);
  const [berita, setBerita] = useState<Berita[]>([]);
  const [absensiMap, setAbsensiMap] = useState<Record<string, string>>({});
  const [sekarang, setSekarang] = useState(new Date());

  function hitungCountdown(target: string) {
    const selisih = new Date(target).getTime() - sekarang.getTime();
    if (selisih <= 0) return "Waktu telah berakhir";

    const totalDetik = Math.floor(selisih / 1000);
    const hari = Math.floor(totalDetik / 86400);
    const jam = Math.floor((totalDetik % 86400) / 3600);
    const menit = Math.floor((totalDetik % 3600) / 60);
    const detik = totalDetik % 60;

    if (hari > 0) return `${hari} hari ${jam} jam ${menit} menit`;
    if (jam > 0) return `${jam} jam ${menit} menit ${detik} detik`;
    return `${menit} menit ${detik} detik`;
  }

  function statusAbsensiLabel(status: string) {
    if (status === "pending") return "Menunggu";
    if (status === "verified") return "Terverifikasi";
    if (status === "rejected") return "Ditolak";
    return status;
  }

  function formatTanggalBerita(tanggal: string) {
    return new Date(tanggal).toLocaleString("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
    });
  }

  function formatTanggalSingkat(tanggal: string) {
    return new Date(tanggal).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function statusJadwal(item: {
    absen_mulai: string | null;
    deadline: string;
  }): "belum_mulai" | "buka" | "tutup" {
    const skrg = sekarang.getTime();
    const mulai = item.absen_mulai ? new Date(item.absen_mulai).getTime() : null;
    const tutup = new Date(item.deadline).getTime();
    if (mulai !== null && skrg < mulai) return "belum_mulai";
    if (skrg >= tutup) return "tutup";
    return "buka";
  }

  useEffect(() => {
    const timer = setInterval(() => setSekarang(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data, error } = await supabase
        .from("mahasiswa")
        .select("id, nama, npm, fakultas, prodi, angkatan, nama_beasiswa, keterangan, must_change_password")
        .eq("profile_id", session.user.id)
        .single();

      if (error || !data) { setLoading(false); return; }
      if (data.must_change_password) { router.push("/ubah-password"); return; }
      setMahasiswa(data);

      const { data: kegiatanData } = await supabase
        .from("kegiatan")
        .select("id, judul, deskripsi, deadline, absen_mulai, status")
        .eq("status", "active")
        .order("deadline", { ascending: true });

      const listKegiatan = kegiatanData || [];
      setKegiatan(listKegiatan);

      if (listKegiatan.length > 0) {
        const kegiatanIds = listKegiatan.map((k) => k.id);
        const { data: absensiData } = await supabase
          .from("absensi")
          .select("kegiatan_id, status")
          .eq("mahasiswa_id", data.id)
          .in("kegiatan_id", kegiatanIds);

        const map: Record<string, string> = {};
        (absensiData || []).forEach((a) => { map[a.kegiatan_id] = a.status; });
        setAbsensiMap(map);
      }

      const { data: beritaData } = await supabase
        .from("berita")
        .select("id, judul, isi, lampiran_url, lampiran_tipe, lampiran_nama, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false });

      setBerita(beritaData || []);
      setLoading(false);
    }
    loadData();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const totalKegiatan = kegiatan.length;
  const totalAbsensiVerified = Object.values(absensiMap).filter((s) => s === "verified").length;
  const totalPending = Object.values(absensiMap).filter((s) => s === "pending").length;
  const totalBerita = berita.length;

  // ANIMASI COUNT-UP
  const animKegiatan = useCountUp(totalKegiatan);
  const animPending = useCountUp(totalPending);
  const animVerified = useCountUp(totalAbsensiVerified);
  const animBerita = useCountUp(totalBerita);

  const inisial = mahasiswa
    ? mahasiswa.nama
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "";

  const tanggalHariIni = sekarang.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const beritaUtama = berita[0] || null;
  const beritaLainnya = berita.slice(1);

  // ==========================================
  // LOADING STATE
  // ==========================================
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-indigo-50 to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200 animate-pulse">
              <svg className="animate-spin w-7 h-7 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
          </div>
          <p className="text-slate-600 text-sm font-semibold">
            Menyiapkan dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (!mahasiswa) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-indigo-50 to-purple-50 p-6">
        <div
          className="text-center bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-sm w-full"
          style={{ animation: "fadeInUp 0.5s ease-out" }}
        >
          <h1 className="text-xl font-bold text-slate-900">Data mahasiswa tidak ditemukan</h1>
          <button
            onClick={handleLogout}
            className="mt-5 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold transition-all"
          >
            Kembali ke Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen">
      {/* BACKGROUND */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-sky-50 via-indigo-50 to-purple-100">
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-br from-blue-200/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-gradient-to-tr from-purple-200/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-[500px] h-[500px] bg-gradient-to-br from-pink-100/30 to-transparent rounded-full blur-3xl" />
      </div>

      {/* HEADER */}
      <header
        className="sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-xl"
        style={{
          animation: "fadeInDown 0.5s ease-out",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1.5 shadow-sm">
              <img src="/logo-unib.png" alt="Logo UNIB" className="w-full h-full object-contain" />
            </div>

            <div className="hidden sm:block">
              <p className="text-sm font-bold text-slate-900 leading-tight tracking-tight">
                Beasiswa Universitas Bengkulu
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                Dashboard Mahasiswa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-600 font-medium px-3 py-2 bg-white/70 rounded-lg border border-white/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {tanggalHariIni}
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 hover:bg-white/80 px-3 py-2 rounded-lg text-sm font-medium transition-all border border-transparent hover:border-white/80"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ============================================ */}
        {/* HERO BESAR — INFO AKADEMIK LENGKAP */}
        {/* ============================================ */}
        <section
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 shadow-lg shadow-indigo-200/50"
          style={{ animation: "fadeInUpBig 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-300 rounded-full blur-3xl" />
          </div>

          <div className="relative p-6 sm:p-8">
            {/* BARIS ATAS: Avatar + Nama + NPM + Angkatan */}
            <div className="flex items-start gap-5">
              <div className="flex-shrink-0">
                <div
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/15 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-lg"
                  style={{
                    animation: "popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both",
                  }}
                >
                  <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {inisial}
                  </span>
                </div>
              </div>

              <div
                className="flex-1 min-w-0"
                style={{
                  animation: "fadeInUp 0.5s ease-out 0.15s both",
                }}
              >
                <p className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">
                  Mahasiswa Penerima Beasiswa
                </p>

                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1 leading-tight">
                  {mahasiswa.nama}
                </h1>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-blue-100">
                  <span className="inline-flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                    </svg>
                    <span className="font-semibold">{mahasiswa.npm}</span>
                  </span>

                  {mahasiswa.angkatan && (
                    <span className="inline-flex items-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Angkatan {mahasiswa.angkatan}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* DETAIL AKADEMIK */}
            <div
              className="mt-6 pt-6 border-t border-white/20"
              style={{ animation: "fadeInUp 0.5s ease-out 0.25s both" }}
            >
              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-3">
                Informasi Akademik
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                    </svg>
                    <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">
                      NPM
                    </p>
                  </div>
                  <p className="text-sm font-bold text-white font-mono truncate">
                    {mahasiswa.npm}
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">
                      Angkatan
                    </p>
                  </div>
                  <p className="text-sm font-bold text-white">
                    {mahasiswa.angkatan || "-"}
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3.5 lg:col-span-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">
                      Fakultas
                    </p>
                  </div>
                  <p className="text-sm font-bold text-white leading-snug">
                    {mahasiswa.fakultas || "-"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">
                      Program Studi
                    </p>
                  </div>
                  <p className="text-sm font-bold text-white leading-snug">
                    {mahasiswa.prodi || "-"}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-amber-400/20 to-amber-500/20 backdrop-blur-sm border border-amber-300/40 rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-amber-200" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M12 2.25c-4.28 0-7.75 3.47-7.75 7.75s3.47 7.75 7.75 7.75 7.75-3.47 7.75-7.75S16.28 2.25 12 2.25zm0 2c3.18 0 5.75 2.57 5.75 5.75S15.18 15.75 12 15.75 6.25 13.18 6.25 10 8.82 4.25 12 4.25zm0 1.5c-2.35 0-4.25 1.9-4.25 4.25S9.65 14.25 12 14.25s4.25-1.9 4.25-4.25S14.35 5.75 12 5.75zm0 1.5c1.52 0 2.75 1.23 2.75 2.75S13.52 12.75 12 12.75 9.25 11.52 9.25 10 10.48 7.25 12 7.25zM8.06 17.66L6.35 21.5l3.65-1.83L12 21.5l2-1.83 3.65 1.83-1.71-3.84A9.71 9.71 0 0112 18.75c-1.4 0-2.73-.36-3.94-.99z" clipRule="evenodd" />
                    </svg>
                    <p className="text-[9px] font-bold text-amber-200 uppercase tracking-wider">
                      Jenis Beasiswa
                    </p>
                  </div>
                  <p className="text-sm font-bold text-white leading-snug">
                    {mahasiswa.nama_beasiswa || "-"}
                  </p>
                </div>
              </div>

              {mahasiswa.keterangan && (
                <div
                  className="mt-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3.5"
                  style={{ animation: "fadeInUp 0.4s ease-out 0.35s both" }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">
                      Keterangan
                    </p>
                  </div>
                  <p className="text-sm text-white leading-relaxed whitespace-pre-line">
                    {mahasiswa.keterangan}
                  </p>
                </div>
              )}
            </div>

            {/* RINGKASAN AKTIVITAS — DENGAN ANIMASI COUNT-UP */}
            <div
              className="mt-6 pt-6 border-t border-white/20 grid grid-cols-2 lg:grid-cols-4 gap-3"
              style={{ animation: "fadeInUp 0.5s ease-out 0.4s both" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xl font-bold text-white tabular-nums leading-none">{animKegiatan}</p>
                  <p className="text-[10px] text-blue-200 font-semibold mt-1 uppercase tracking-wider">Kegiatan Aktif</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xl font-bold text-white tabular-nums leading-none">{animPending}</p>
                  <p className="text-[10px] text-blue-200 font-semibold mt-1 uppercase tracking-wider">Menunggu Verif.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xl font-bold text-white tabular-nums leading-none">{animVerified}</p>
                  <p className="text-[10px] text-blue-200 font-semibold mt-1 uppercase tracking-wider">Terverifikasi</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xl font-bold text-white tabular-nums leading-none">{animBerita}</p>
                  <p className="text-[10px] text-blue-200 font-semibold mt-1 uppercase tracking-wider">Berita</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* KEGIATAN SECTION */}
        {/* ============================================ */}
        <section
          style={{ animation: "fadeInUp 0.6s ease-out 0.5s both" }}
        >
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Kegiatan Aktif
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Silakan lakukan absensi pada kegiatan di bawah ini
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400 tabular-nums">
              {totalKegiatan} kegiatan
            </span>
          </div>

          {kegiatan.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-slate-700 font-semibold">Belum ada kegiatan aktif</p>
              <p className="text-sm text-slate-400 mt-1">Kegiatan dari admin akan tampil di sini</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {kegiatan.map((item, idx) => {
                const statusAbsen = absensiMap[item.id];
                const jadwal = statusJadwal(item);

                const statusBadgeConfig =
                  jadwal === "buka"
                    ? { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500", label: "Dibuka" }
                    : jadwal === "belum_mulai"
                    ? { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500", label: "Belum Dibuka" }
                    : { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200", dot: "bg-slate-400", label: "Ditutup" };

                const accentBar =
                  jadwal === "buka" ? "bg-gradient-to-b from-blue-500 to-indigo-500"
                  : jadwal === "belum_mulai" ? "bg-gradient-to-b from-amber-400 to-orange-500"
                  : "bg-gradient-to-b from-slate-300 to-slate-400";

                return (
                  <article
                    key={item.id}
                    className="relative bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden
                               transition-all duration-300
                               hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5"
                    style={{
                      animation: `fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${
                        0.6 + idx * 0.08
                      }s both`,
                    }}
                  >
                    <div className={`absolute top-0 bottom-0 left-0 w-1 ${accentBar}`} />

                    <div className="pl-6 pr-5 py-5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-base font-bold text-slate-900 leading-snug flex-1">
                          {item.judul}
                        </h3>

                        <span className={`inline-flex items-center gap-1.5 ${statusBadgeConfig.bg} ${statusBadgeConfig.text} ${statusBadgeConfig.border} border text-[11px] font-semibold px-2.5 py-1 rounded-md whitespace-nowrap`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusBadgeConfig.dot} ${jadwal === "buka" ? "animate-pulse" : ""}`} />
                          {statusBadgeConfig.label}
                        </span>
                      </div>

                      {item.deskripsi && (
                        <p className="text-sm text-slate-500 leading-relaxed mb-4">
                          {item.deskripsi}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                            Mulai Absen
                          </p>
                          <p className="text-xs font-semibold text-slate-700">
                            {item.absen_mulai ? formatTanggalSingkat(item.absen_mulai) : "Kapan saja"}
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                            Batas Akhir
                          </p>
                          <p className="text-xs font-semibold text-slate-700">
                            {formatTanggalSingkat(item.deadline)}
                          </p>
                        </div>
                      </div>

                      {jadwal === "buka" && !statusAbsen ? (
                        <div className="rounded-xl p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                              Sisa Waktu
                            </p>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-base font-bold text-blue-800 tabular-nums mb-3">
                            {hitungCountdown(item.deadline)}
                          </p>
                          <button
                            onClick={() => router.push(`/absensi/${item.id}`)}
                            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 rounded-lg font-semibold text-sm
                                       transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Absensi Sekarang
                          </button>
                        </div>
                      ) : jadwal === "belum_mulai" ? (
                        <div className="rounded-xl p-4 bg-amber-50 border border-amber-100 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                              Dibuka Dalam
                            </p>
                            <p className="text-sm font-bold text-amber-800 tabular-nums">
                              {item.absen_mulai ? hitungCountdown(item.absen_mulai) : "-"}
                            </p>
                          </div>
                        </div>
                      ) : statusAbsen ? (
                        <div className="rounded-xl p-4 bg-slate-50 border border-slate-200 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Status Absensi Anda
                            </p>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {statusAbsen === "pending" && "Sedang menunggu verifikasi admin"}
                              {statusAbsen === "verified" && "Absensi Anda telah diverifikasi"}
                              {statusAbsen === "rejected" && "Absensi Anda ditolak"}
                            </p>
                          </div>
                          <span
                            className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold border ${
                              statusAbsen === "pending"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : statusAbsen === "verified"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            {statusAbsensiLabel(statusAbsen)}
                          </span>
                        </div>
                      ) : (
                        <div className="rounded-xl p-4 bg-slate-50 border border-slate-200 text-center">
                          <p className="text-xs font-medium text-slate-600">
                            Absensi telah ditutup
                          </p>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ============================================ */}
        {/* BERITA SECTION */}
        {/* ============================================ */}
        <section
          style={{
            animation: `fadeInUp 0.6s ease-out ${
              0.6 + kegiatan.length * 0.08
            }s both`,
          }}
        >
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Berita & Pengumuman
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Informasi terbaru untuk mahasiswa penerima beasiswa
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400 tabular-nums">
              {totalBerita} berita
            </span>
          </div>

          {berita.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <p className="text-slate-700 font-semibold">Belum ada berita</p>
              <p className="text-sm text-slate-400 mt-1">Informasi dari admin akan tampil di sini</p>
            </div>
          ) : (
            <div className="space-y-5">
              {beritaUtama && (
                <article
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300"
                  style={{
                    animation: `fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${
                      0.7 + kegiatan.length * 0.08
                    }s both`,
                  }}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-5">
                    <div className="lg:col-span-2 relative min-h-[220px] lg:min-h-full overflow-hidden">
                      {beritaUtama.lampiran_url && beritaUtama.lampiran_tipe === "gambar" ? (
                        <a
                          href={beritaUtama.lampiran_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 block group"
                        >
                          <img
                            src={beritaUtama.lampiran_url}
                            alt={beritaUtama.lampiran_nama || "Lampiran"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </a>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 flex items-center justify-center p-6">
                          <div className="text-center">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center mx-auto mb-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                              </svg>
                            </div>
                            <p className="text-white text-xs font-bold uppercase tracking-wider">
                              Berita Utama
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-3 p-6 sm:p-7">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                          Terbaru
                        </span>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight mb-3">
                        {beritaUtama.judul}
                      </h3>

                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatTanggalBerita(beritaUtama.created_at)}
                      </div>

                      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                        {beritaUtama.isi}
                      </div>

                      {beritaUtama.lampiran_url && beritaUtama.lampiran_tipe === "pdf" && (
                        <a
                          href={beritaUtama.lampiran_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-5 inline-flex items-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          {beritaUtama.lampiran_nama || "Buka Lampiran PDF"}
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              )}

              {beritaLainnya.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {beritaLainnya.map((item, idx) => (
                    <article
                      key={item.id}
                      className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden
                                 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5
                                 transition-all duration-300 flex flex-col"
                      style={{
                        animation: `fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${
                          0.8 + kegiatan.length * 0.08 + idx * 0.08
                        }s both`,
                      }}
                    >
                      {item.lampiran_url && item.lampiran_tipe === "gambar" && (
                        <a
                          href={item.lampiran_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block overflow-hidden bg-slate-100 h-44"
                        >
                          <img
                            src={item.lampiran_url}
                            alt={item.lampiran_nama || "Lampiran"}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                          />
                        </a>
                      )}

                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatTanggalBerita(item.created_at)}
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 leading-snug mb-3">
                          {item.judul}
                        </h3>

                        <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-line flex-1">
                          {item.isi}
                        </div>

                        {item.lampiran_url && item.lampiran_tipe === "pdf" && (
                          <a
                            href={item.lampiran_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:text-red-800 pt-3 border-t border-slate-100"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Buka Lampiran PDF
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="pt-6 pb-2 text-center">
          <p className="text-xs text-slate-500 font-medium">
            © {new Date().getFullYear()} Sistem Informasi Beasiswa — Universitas Bengkulu
          </p>
        </footer>
      </div>
    </main>
  );
}