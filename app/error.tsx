"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [tujuan, setTujuan] = useState("/login");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.error("APP ERROR:", error);
  }, [error]);

  useEffect(() => {
    let aktif = true;

    async function tentukanTujuan() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!aktif) return;

        // Belum login → ke /login
        if (!session) {
          setTujuan("/login");
          setLoading(false);
          return;
        }

        // Cek role
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (!aktif) return;

        if (profile?.role === "admin") {
          setTujuan("/admin");
        } else {
          setTujuan("/dashboard");
        }
      } catch (err) {
        console.error("TENTUKAN TUJUAN ERROR:", err);

        if (aktif) {
          setTujuan("/login");
        }
      } finally {
        if (aktif) setLoading(false);
      }
    }

    tentukanTujuan();

    return () => {
      aktif = false;
    };
  }, []);

  function labelTombol() {
    if (loading) return "Memuat...";
    if (tujuan === "/admin") return "Ke Dashboard Admin";
    if (tujuan === "/dashboard") return "Ke Dashboard";
    return "Ke Halaman Login";
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-white to-red-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
        {/* Ikon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Judul */}
        <h1 className="text-xl font-bold tracking-tight text-slate-800">
          Terjadi Kesalahan
        </h1>

        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          Maaf, ada masalah saat memuat halaman ini. Silakan
          coba lagi, atau kembali ke halaman utama.
        </p>

        {/* Detail error */}
        {error.message && (
          <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl p-3 text-left">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Detail
            </p>

            <p className="text-xs text-slate-600 break-words font-mono">
              {error.message}
            </p>
          </div>
        )}

        {/* Tombol aksi */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="flex-1 inline-flex items-center justify-center gap-2
                       bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm
                       px-5 py-3 rounded-xl
                       shadow-lg shadow-blue-200
                       transition-all duration-200
                       hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-300
                       active:translate-y-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Coba Lagi
          </button>

          <button
            onClick={() => {
              window.location.href = tujuan;
            }}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2
                       bg-white text-slate-700 border border-slate-200 font-medium text-sm
                       px-5 py-3 rounded-xl
                       transition-all duration-200
                       hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300
                       disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            {labelTombol()}
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-6">
          Kalau masalah ini terus muncul, hubungi administrator.
        </p>
      </div>
    </main>
  );
}