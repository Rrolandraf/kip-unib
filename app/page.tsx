"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1.5 shadow-sm">
              <img
                src="/logo-unib.png"
                alt="Logo UNIB"
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <h1 className="text-sm font-bold text-slate-800 leading-tight">
                KIP Kuliah
              </h1>

              <p className="text-xs text-slate-500">
                Universitas Bengkulu
              </p>
            </div>
          </div>

          <Link
            href="/login"
            className="text-sm font-medium text-blue-600 hover:text-blue-800
                       transition-colors"
          >
            Masuk →
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Dekorasi blur */}
        <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-300/30 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div
            className="max-w-3xl mx-auto text-center"
            style={{ animation: "fadeInUp 0.5s ease-out" }}
          >
            <span className="inline-block bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full text-xs font-medium mb-5">
              Sistem Informasi
            </span>

            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-800 leading-tight">
              KIP Kuliah{" "}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Universitas Bengkulu
              </span>
            </h1>

            <p className="text-slate-600 mt-5 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
              Platform terintegrasi untuk mengelola data mahasiswa
              penerima KIP Kuliah, kegiatan, absensi, dan
              pengumuman di lingkungan Universitas Bengkulu.
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2
                           bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold
                           px-6 py-3 rounded-xl
                           shadow-lg shadow-blue-200
                           transition-all duration-200
                           hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-300
                           active:translate-y-0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
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
                Login Mahasiswa
              </Link>

              <Link
                href="/admin/login"
                className="inline-flex items-center justify-center gap-2
                           bg-white text-slate-700 border border-slate-200 font-semibold
                           px-6 py-3 rounded-xl
                           transition-all duration-200
                           hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                Login Admin
              </Link>
            </div>
          </div>

          {/* Fitur unggulan */}
          <div className="mt-20 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                judul: "Absensi Online",
                deskripsi:
                  "Mahasiswa dapat melakukan absensi kegiatan kapan saja dengan upload bukti kehadiran.",
                warna: "blue",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                ),
              },
              {
                judul: "Verifikasi Cepat",
                deskripsi:
                  "Admin dapat memverifikasi atau menolak absensi mahasiswa secara langsung.",
                warna: "emerald",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                ),
              },
              {
                judul: "Kelola Kegiatan",
                deskripsi:
                  "Buat dan atur kegiatan KIP Kuliah lengkap dengan deadline absensi otomatis.",
                warna: "indigo",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                ),
              },
              {
                judul: "Berita & Pengumuman",
                deskripsi:
                  "Sampaikan informasi terbaru kepada seluruh mahasiswa penerima KIP.",
                warna: "amber",
                icon: (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                  />
                ),
              },
            ].map((fitur, idx) => {
              const warnaMap: Record<
                string,
                { bg: string; text: string }
              > = {
                blue: {
                  bg: "bg-blue-50 border-blue-100",
                  text: "text-blue-600",
                },
                emerald: {
                  bg: "bg-emerald-50 border-emerald-100",
                  text: "text-emerald-600",
                },
                indigo: {
                  bg: "bg-indigo-50 border-indigo-100",
                  text: "text-indigo-600",
                },
                amber: {
                  bg: "bg-amber-50 border-amber-100",
                  text: "text-amber-600",
                },
              };

              const w = warnaMap[fitur.warna];

              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6
                             transition-all duration-300 ease-out
                             hover:-translate-y-1 hover:shadow-lg"
                  style={{
                    animation: `fadeInUp 0.5s ease-out`,
                    animationDelay: `${idx * 80}ms`,
                    animationFillMode: "backwards",
                  }}
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${w.bg} border flex items-center justify-center ${w.text} mb-4`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      {fitur.icon}
                    </svg>
                  </div>

                  <h3 className="text-base font-bold text-slate-800">
                    {fitur.judul}
                  </h3>

                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    {fitur.deskripsi}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 bg-white/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Sistem Informasi KIP
            Kuliah — Universitas Bengkulu
          </p>

          <p className="text-xs text-slate-400">
            Powered by{" "}
            <span className="font-semibold text-slate-600">
              RdZ Production
            </span>
          </p>
        </div>
      </footer>
    </main>
  );
}