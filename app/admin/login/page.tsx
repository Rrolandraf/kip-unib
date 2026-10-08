"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) {
        setError("Email atau password admin salah.");
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Login gagal.");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();

        setError("Data profil admin tidak ditemukan.");
        setLoading(false);
        return;
      }

      if (profile.role !== "admin") {
        await supabase.auth.signOut();

        setError("Akun ini bukan akun admin.");
        setLoading(false);
        return;
      }

      router.push("/admin");
    } catch (error) {
      console.error("ADMIN LOGIN ERROR:", error);
      setError("Terjadi kesalahan saat login.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-100">
      {/* Dekorasi background */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-indigo-300/30 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 bg-purple-300/30 rounded-full blur-3xl" />

      <div
        className="relative w-full max-w-md bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-100 p-8"
        style={{ animation: "fadeInUp 0.5s ease-out" }}
      >
        {/* Logo UNIB */}
        <div className="flex justify-center mb-4">
          <div
            className="w-20 h-20 rounded-2xl bg-white border-2 border-indigo-600 flex items-center justify-center shadow-md p-2"
            style={{ animation: "fadeIn 0.6s ease-out" }}
          >
            <img
              src="/logo-unib.png"
              alt="Logo Universitas Bengkulu"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center tracking-tight text-slate-800">
          Login Admin
        </h1>

        <p className="text-center text-slate-500 mt-1 mb-8 text-sm">
          Sistem Informasi KIP Kuliah Universitas Bengkulu
        </p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-700">
              Email Admin
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-800
                         placeholder:text-slate-400
                         transition-all duration-200 ease-out
                         focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100
                         hover:border-slate-300"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-700">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-800
                         placeholder:text-slate-400
                         transition-all duration-200 ease-out
                         focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100
                         hover:border-slate-300"
            />
          </div>

          {error && (
            <div
              className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl flex items-start gap-2"
              style={{ animation: "shake 0.4s ease-in-out" }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 flex-shrink-0 mt-0.5"
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

              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold
                       py-3 rounded-xl
                       shadow-lg shadow-indigo-200
                       transition-all duration-200 ease-out
                       hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-300
                       active:translate-y-0
                       disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0
                       flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin w-5 h-5 text-white"
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
                Memproses...
              </>
            ) : (
              "Login Admin"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Halaman ini khusus untuk admin. Mahasiswa login di{" "}
          <a
            href="/login"
            className="text-indigo-600 hover:text-indigo-800 font-medium underline-offset-2 hover:underline"
          >
            /login
          </a>
          .
        </p>
      </div>
    </main>
  );
}