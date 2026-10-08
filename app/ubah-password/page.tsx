"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function UbahPasswordPage() {
  const router = useRouter();

  const [passwordBaru, setPasswordBaru] = useState("");
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPasswordBaru, setShowPasswordBaru] =
    useState(false);
  const [showKonfirmasi, setShowKonfirmasi] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (passwordBaru.length < 6) {
      setError("Password baru minimal 6 karakter.");
      return;
    }

    if (passwordBaru !== konfirmasiPassword) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Session tidak ditemukan. Silakan login kembali.");
        setLoading(false);
        return;
      }

      const { error: passwordError } =
        await supabase.auth.updateUser({
          password: passwordBaru,
        });

      if (passwordError) {
        setError(passwordError.message);
        setLoading(false);
        return;
      }

      const response = await fetch(
        "/api/mahasiswa/complete-password-change",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ||
            "Password berubah, tetapi status akun gagal diperbarui."
        );
        setLoading(false);
        return;
      }

      setSuccess("Password berhasil diubah.");

      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (error) {
      console.error(error);
      setError("Terjadi kesalahan pada sistem.");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Dekorasi background */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-300/30 rounded-full blur-3xl" />

      <div
        className="relative w-full max-w-md bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-100 p-8"
        style={{ animation: "fadeInUp 0.5s ease-out" }}
      >
        {/* Logo UNIB */}
        <div className="flex justify-center mb-4">
          <div
            className="w-20 h-20 rounded-2xl bg-white border-2 border-blue-600 flex items-center justify-center shadow-md p-2"
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
          Ubah Password
        </h1>

        <p className="text-center text-slate-500 mt-1 mb-8 text-sm">
          Silakan ubah password awal sebelum melanjutkan.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Password baru */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-700">
              Password Baru
            </label>

            <div className="relative">
              <input
                type={showPasswordBaru ? "text" : "password"}
                value={passwordBaru}
                onChange={(e) =>
                  setPasswordBaru(e.target.value)
                }
                placeholder="Minimal 6 karakter"
                required
                className="w-full border-2 border-slate-200 rounded-xl pl-4 pr-12 py-3 text-slate-800
                           placeholder:text-slate-400
                           transition-all duration-200 ease-out
                           focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                           hover:border-slate-300"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPasswordBaru((v) => !v)
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
                aria-label={
                  showPasswordBaru
                    ? "Sembunyikan password"
                    : "Tampilkan password"
                }
              >
                {showPasswordBaru ? (
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
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
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
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-1.5">
              Minimal 6 karakter.
            </p>
          </div>

          {/* Konfirmasi password */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-700">
              Konfirmasi Password Baru
            </label>

            <div className="relative">
              <input
                type={showKonfirmasi ? "text" : "password"}
                value={konfirmasiPassword}
                onChange={(e) =>
                  setKonfirmasiPassword(e.target.value)
                }
                placeholder="Masukkan kembali password"
                required
                className="w-full border-2 border-slate-200 rounded-xl pl-4 pr-12 py-3 text-slate-800
                           placeholder:text-slate-400
                           transition-all duration-200 ease-out
                           focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                           hover:border-slate-300"
              />

              <button
                type="button"
                onClick={() => setShowKonfirmasi((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
                aria-label={
                  showKonfirmasi
                    ? "Sembunyikan password"
                    : "Tampilkan password"
                }
              >
                {showKonfirmasi ? (
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
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
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
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
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

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3 rounded-xl flex items-start gap-2">
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>

              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold
                       py-3 rounded-xl
                       shadow-lg shadow-blue-200
                       transition-all duration-200 ease-out
                       hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-300
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
                Menyimpan...
              </>
            ) : (
              "Simpan Password Baru"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Setelah berhasil, Anda akan diarahkan ke dashboard.
        </p>
      </div>
    </main>
  );
}