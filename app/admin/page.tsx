"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  const menus = [
    {
      judul: "Tambah Mahasiswa",
      deskripsi:
        "Menambahkan akun mahasiswa penerima beasiswa dan mereset password.",
      href: "/admin/mahasiswa",
      warna: "blue",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
      ),
    },
    {
      judul: "Kelola Kegiatan",
      deskripsi:
        "Membuat kegiatan dan mengatur jadwal absensi.",
      href: "/admin/kegiatan",
      warna: "indigo",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6"
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
      ),
    },
    {
      judul: "Data Absensi",
      deskripsi:
        "Melihat dan memverifikasi absensi mahasiswa.",
      href: "/admin/absensi",
      warna: "emerald",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      judul: "Berita & Pengumuman",
      deskripsi:
        "Mengelola berita dan pengumuman mahasiswa.",
      href: "/admin/berita",
      warna: "amber",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6"
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
      ),
    },
  ];

  const warnaMap: Record<
    string,
    { bg: string; text: string; hover: string }
  > = {
    blue: {
      bg: "bg-blue-50 border-blue-100",
      text: "text-blue-600",
      hover: "hover:border-blue-300",
    },
    indigo: {
      bg: "bg-indigo-50 border-indigo-100",
      text: "text-indigo-600",
      hover: "hover:border-indigo-300",
    },
    emerald: {
      bg: "bg-emerald-50 border-emerald-100",
      text: "text-emerald-600",
      hover: "hover:border-emerald-300",
    },
    amber: {
      bg: "bg-amber-50 border-amber-100",
      text: "text-amber-600",
      hover: "hover:border-amber-300",
    },
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-700 via-indigo-700 to-purple-700 text-white shadow-lg">
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
                Dashboard Admin
              </h1>

              <p className="text-xs text-indigo-100 mt-0.5">
                Sistem Informasi Beasiswa Universitas Bengkulu
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="bg-white/15 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium
                       transition-all duration-200
                       hover:bg-white hover:text-indigo-700 hover:-translate-y-0.5 hover:shadow-lg"
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
            Menu Admin
          </h2>

          <p className="text-slate-500 mt-1 text-sm">
            Pilih menu yang ingin Anda kelola.
          </p>
        </section>

        {/* Grid menu */}
        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menus.map((menu, idx) => {
            const warna = warnaMap[menu.warna];

            return (
              <button
                key={menu.href}
                onClick={() => router.push(menu.href)}
                className={`group bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-left
                            transition-all duration-300 ease-out
                            hover:-translate-y-1 hover:shadow-xl ${warna.hover}`}
                style={{
                  animation: `fadeInUp 0.5s ease-out`,
                  animationDelay: `${idx * 60}ms`,
                  animationFillMode: "backwards",
                }}
              >
                <div
                  className={`w-12 h-12 rounded-xl ${warna.bg} border flex items-center justify-center ${warna.text}
                              transition-transform duration-300 group-hover:scale-110`}
                >
                  {menu.icon}
                </div>

                <h3 className="text-base font-bold text-slate-800 mt-4">
                  {menu.judul}
                </h3>

                <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                  {menu.deskripsi}
                </p>

                <div
                  className={`mt-4 flex items-center gap-1 text-sm font-medium ${warna.text}
                              transition-all duration-200 group-hover:gap-2`}
                >
                  Buka
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </div>
              </button>
            );
          })}
        </section>
      </div>
    </main>
  );
}