"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Kegiatan = {
  id: string;
  judul: string;
  deskripsi: string | null;
  deadline: string;
  status: string;
};

export default function AbsensiPage() {
  const params = useParams();
  const router = useRouter();

  const kegiatanId = params.id as string;

  const [kegiatan, setKegiatan] = useState<Kegiatan | null>(null);
  const [loading, setLoading] = useState(true);
  const [foto, setFoto] = useState<File | null>(null);
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [mengirim, setMengirim] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadKegiatan() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("kegiatan")
        .select("id, judul, deskripsi, deadline, status")
        .eq("id", kegiatanId)
        .single();

      if (error || !data) {
        console.error("ERROR KEGIATAN:", error);
        setError("Kegiatan tidak ditemukan.");
        setLoading(false);
        return;
      }

      setKegiatan(data);
      setLoading(false);
    }

    loadKegiatan();
  }, [kegiatanId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!foto) {
      setError("Silakan pilih foto bukti kehadiran.");
      return;
    }

    if (!konfirmasi) {
      setError("Silakan centang konfirmasi kehadiran.");
      return;
    }

    setMengirim(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const formData = new FormData();
      formData.append("foto", foto);
      formData.append("kegiatan_id", kegiatanId);
      formData.append("konfirmasi", "true");

      const response = await fetch("/api/absensi", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Gagal mengirim absensi.");
        setMengirim(false);
        return;
      }

      setSuccess("Absensi berhasil dikirim.");
      setFoto(null);
      setKonfirmasi(false);
    } catch (error) {
      console.error(error);
      setError("Terjadi kesalahan pada sistem.");
    }

    setMengirim(false);
  }

  function formatTanggal(tanggal: string) {
    return new Date(tanggal).toLocaleString("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
    });
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
            Memuat kegiatan...
          </p>
        </div>
      </main>
    );
  }

  if (!kegiatan) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-red-600"
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

          <p className="text-red-600 font-medium">{error}</p>

          <button
            onClick={() => router.push("/dashboard")}
            className="mt-5 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold shadow-lg shadow-blue-200
                       transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </main>
    );
  }

  const deadlineLewat =
    new Date(kegiatan.deadline).getTime() <= Date.now();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
          style={{ animation: "fadeInUp 0.5s ease-out" }}
        >
          {/* Tombol kembali */}
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm mb-6
                       transition-all duration-200 hover:-translate-x-0.5"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Kembali ke Dashboard
          </button>

          {/* Judul */}
          <div className="flex items-center gap-3 mb-1">
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
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-800">
              Absensi Kegiatan
            </h1>
          </div>

          {/* Info kegiatan */}
          <div className="mt-6 border border-slate-200 rounded-xl p-5 bg-slate-50/50">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-800">
                {kegiatan.judul}
              </h2>

              <span
                className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  kegiatan.status === "active"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                {kegiatan.status === "active" ? "Aktif" : kegiatan.status}
              </span>
            </div>

            {kegiatan.deskripsi && (
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                {kegiatan.deskripsi}
              </p>
            )}

            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Deadline
              </p>

              <p className="font-medium text-slate-800 text-sm mt-1">
                {formatTanggal(kegiatan.deadline)}
              </p>
            </div>
          </div>

          {/* Kalau deadline lewat */}
          {deadlineLewat ? (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-start gap-3">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>

              <div>
                <p className="font-medium">
                  Deadline absensi telah berakhir.
                </p>

                <p className="text-sm mt-1 text-red-600/90">
                  Anda tidak dapat mengirim absensi untuk kegiatan ini.
                </p>
              </div>
            </div>
          ) : (
            /* Form absensi */
            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-5"
            >
              {/* Upload foto */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-slate-700">
                  Foto Bukti Kehadiran
                </label>

                <div
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200
                              ${
                                foto
                                  ? "border-emerald-300 bg-emerald-50/40"
                                  : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"
                              }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setFoto(e.target.files?.[0] || null)
                    }
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="foto-upload"
                  />

                  <div className="pointer-events-none">
                    {foto ? (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto mb-3">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-6 h-6 text-emerald-600"
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
                        </div>

                        <p className="text-sm font-medium text-emerald-800">
                          {foto.name}
                        </p>

                        <p className="text-xs text-emerald-600 mt-1">
                          Klik untuk mengganti foto
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-6 h-6 text-blue-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>

                        <p className="text-sm font-medium text-slate-700">
                          Klik untuk memilih foto
                        </p>

                        <p className="text-xs text-slate-400 mt-1">
                          Format JPG/PNG, maksimal 5 MB
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Checkbox konfirmasi */}
              <label
                htmlFor="konfirmasi"
                className={`flex items-start gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all duration-200
                            ${
                              konfirmasi
                                ? "border-blue-300 bg-blue-50/40"
                                : "border-slate-200 hover:border-blue-200 hover:bg-blue-50/30"
                            }`}
              >
                <input
                  id="konfirmasi"
                  type="checkbox"
                  checked={konfirmasi}
                  onChange={(e) =>
                    setKonfirmasi(e.target.checked)
                  }
                  className="mt-0.5 w-4 h-4 accent-blue-600"
                />

                <span className="text-sm text-slate-700 leading-relaxed">
                  Saya menyatakan bahwa saya benar-benar
                  mengikuti kegiatan ini dan foto yang saya
                  upload merupakan bukti kehadiran saya.
                </span>
              </label>

              {/* Pesan error */}
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

              {/* Pesan sukses */}
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

              {/* Tombol kirim */}
              <button
                type="submit"
                disabled={mengirim}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold
                           py-3 rounded-xl
                           shadow-lg shadow-blue-200
                           transition-all duration-200
                           hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-300
                           active:translate-y-0
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0
                           flex items-center justify-center gap-2"
              >
                {mengirim ? (
                  <>
                    <svg
                      className="animate-spin w-5 h-5"
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
                    Mengirim Absensi...
                  </>
                ) : (
                  <>
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
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    Kirim Absensi
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}