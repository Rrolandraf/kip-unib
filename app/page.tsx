"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Berita = {
  id: string;
  judul: string;
  isi: string;
  lampiran_url: string | null;
  lampiran_tipe: string | null;
  lampiran_nama: string | null;
  created_at: string;
};

export default function Home() {
  const [berita, setBerita] = useState<Berita[]>([]);
  const [loadingBerita, setLoadingBerita] = useState(true);

  useEffect(() => {
    async function loadBerita() {
      try {
        const { data } = await supabase
          .from("berita")
          .select("id, judul, isi, lampiran_url, lampiran_tipe, lampiran_nama, created_at")
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(3);

        if (data) setBerita(data);
      } catch (err) {
        console.error("Gagal load berita:", err);
      } finally {
        setLoadingBerita(false);
      }
    }
    loadBerita();
  }, []);

  function formatTanggal(tanggal: string) {
    return new Date(tanggal).toLocaleString("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
    });
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1.5 shadow-sm">
              <img src="/logo-unib.png" alt="Logo UNIB" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 leading-tight">Beasiswa</h1>
              <p className="text-xs text-slate-500">Universitas Bengkulu</p>
            </div>
          </div>
          <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
            Login →
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-300/30 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24 text-center">
          <div className="max-w-3xl mx-auto" style={{ animation: "fadeInUp 0.5s ease-out" }}>
            <span className="inline-block bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-xs font-medium mb-5">
              Sistem Informasi
            </span>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-800 leading-tight">
              Beasiswa{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Universitas Bengkulu
              </span>
            </h1>
            <p className="text-slate-600 mt-5 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
              Platform terintegrasi untuk mengelola data mahasiswa penerima beasiswa, kegiatan, absensi, dan pengumuman di lingkungan Universitas Bengkulu.
            </p>
            
            {/* TOMBOL LOGIN UTAMA */}
            <div className="mt-10 flex justify-center">
              <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold px-10 py-4 rounded-xl shadow-lg shadow-blue-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-300 active:translate-y-0 text-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Login
              </Link>
            </div>
          </div>

          {/* FITUR UNGGULAN */}
          <div className="mt-20 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { judul: "Absensi Online", deskripsi: "Mahasiswa dapat melakukan absensi kegiatan kapan saja dengan upload bukti kehadiran.", warna: "blue", icon: (<path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />) },
              { judul: "Verifikasi Cepat", deskripsi: "Admin dapat memverifikasi atau menolak absensi mahasiswa secara langsung.", warna: "emerald", icon: (<path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />) },
              { judul: "Kelola Kegiatan", deskripsi: "Buat dan atur kegiatan lengkap dengan jadwal absensi otomatis.", warna: "indigo", icon: (<path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />) },
              { judul: "Berita & Pengumuman", deskripsi: "Sampaikan informasi terbaru kepada seluruh mahasiswa penerima beasiswa.", warna: "amber", icon: (<path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />) },
            ].map((fitur, idx) => {
              const warnaMap: Record<string, { bg: string; text: string }> = {
                blue: { bg: "bg-blue-50 border-blue-100", text: "text-blue-600" },
                emerald: { bg: "bg-emerald-50 border-emerald-100", text: "text-emerald-600" },
                indigo: { bg: "bg-indigo-50 border-indigo-100", text: "text-indigo-600" },
                amber: { bg: "bg-amber-50 border-amber-100", text: "text-amber-600" },
              };
              const w = warnaMap[fitur.warna];
              return (
                <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg" style={{ animation: `fadeInUp 0.5s ease-out`, animationDelay: `${idx * 80}ms`, animationFillMode: "backwards" }}>
                  <div className={`w-12 h-12 rounded-xl ${w.bg} border flex items-center justify-center ${w.text} mb-4`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>{fitur.icon}</svg>
                  </div>
                  <h3 className="text-base font-bold text-slate-800">{fitur.judul}</h3>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">{fitur.deskripsi}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION BERITA DI LANDING PAGE */}
      <section className="bg-slate-50 py-16 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Berita & Pengumuman Terbaru</h2>
              <p className="text-sm text-slate-500 mt-1">Informasi terkini seputar beasiswa Universitas Bengkulu.</p>
            </div>
            <Link href="/login" className="hidden sm:inline-flex text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
              Lihat Semua →
            </Link>
          </div>

          {loadingBerita ? (
            <div className="text-center py-12 text-slate-500 text-sm">Memuat berita...</div>
          ) : berita.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">Belum ada berita terbaru.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {berita.map((item, idx) => (
                <article key={item.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col" style={{ animation: `fadeInUp 0.5s ease-out`, animationDelay: `${idx * 100}ms`, animationFillMode: "backwards" }}>
                  {item.lampiran_url && item.lampiran_tipe === "gambar" && (
                    <div className="h-48 overflow-hidden bg-slate-100">
                      <img src={item.lampiran_url} alt={item.lampiran_nama || "Lampiran"} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {formatTanggal(item.created_at)}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug mb-3">{item.judul}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line line-clamp-4 flex-1">{item.isi}</p>
                    <Link href="/login" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 pt-3 border-t border-slate-100">
                      Baca Selengkapnya (Login)
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <p className="text-sm text-slate-500">© 2026 Sistem Informasi Beasiswa — Universitas Bengkulu</p>
          <p className="text-xs text-slate-400">Powered by <span className="font-semibold text-slate-600">RdZ Production</span></p>
        </div>
      </footer>
    </main>
  );
}