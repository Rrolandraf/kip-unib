"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Kegiatan = {
  id: string;
  judul: string;
  deskripsi: string | null;
  deadline: string;
  absen_mulai: string | null;
  status: string;
};

export default function AbsensiPage() {
  const params = useParams();
  const router = useRouter();

  const kegiatanId = params.id as string;

  const [kegiatan, setKegiatan] = useState<Kegiatan | null>(null);
  const [loading, setLoading] = useState(true);
  const [foto, setFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    null
  );
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [mengirim, setMengirim] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sekarang, setSekarang] = useState(new Date());

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update jam tiap detik
  useEffect(() => {
    const timer = setInterval(() => {
      setSekarang(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Preview foto
  useEffect(() => {
    if (!foto) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(foto);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [foto]);

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
        .select(
          "id, judul, deskripsi, deadline, absen_mulai, status"
        )
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

      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (error) {
      console.error(error);
      setError("Terjadi kesalahan pada sistem.");
      setMengirim(false);
    }
  }

  function formatTanggal(tanggal: string) {
    return new Date(tanggal).toLocaleString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function hitungCountdown(target: string) {
    const selisih =
      new Date(target).getTime() - sekarang.getTime();

    if (selisih <= 0) {
      return "Waktu telah berakhir";
    }

    const totalDetik = Math.floor(selisih / 1000);

    const hari = Math.floor(totalDetik / 86400);
    const jam = Math.floor((totalDetik % 86400) / 3600);
    const menit = Math.floor((totalDetik % 3600) / 60);
    const detik = totalDetik % 60;

    if (hari > 0) {
      return `${hari} hari ${jam} jam ${menit} menit`;
    }

    if (jam > 0) {
      return `${jam} jam ${menit} menit ${detik} detik`;
    }

    return `${menit} menit ${detik} detik`;
  }

  // ==========================================
  // STATUS JADWAL
  // ==========================================
  function statusJadwal(): "belum_mulai" | "buka" | "tutup" {
    if (!kegiatan) return "tutup";

    const skrg = sekarang.getTime();
    const mulai = kegiatan.absen_mulai
      ? new Date(kegiatan.absen_mulai).getTime()
      : null;
    const tutup = new Date(kegiatan.deadline).getTime();

    if (mulai !== null && skrg < mulai) {
      return "belum_mulai";
    }

    if (skrg >= tutup) {
      return "tutup";
    }

    return "buka";
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

  const jadwal = statusJadwal();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 via-blue-700 to-indigo-700 text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 text-white/90 hover:text-white font-medium text-sm
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

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center p-1.5">
              <img
                src="/logo-unib.png"
                alt="Logo UNIB"
                className="w-full h-full object-contain"
              />
            </div>

            <p className="text-sm font-semibold hidden sm:block">
              Absensi Kegiatan
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* INFO KEGIATAN */}
        <section
          className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
          style={{ animation: "fadeInUp 0.4s ease-out" }}
        >
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 px-6 py-5 border-b border-blue-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-blue-100 flex items-center justify-center">
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>

              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                  Kegiatan
                </p>
                <h1 className="text-lg font-bold text-slate-800 mt-0.5">
                  {kegiatan.judul}
                </h1>
              </div>
            </div>

            {kegiatan.deskripsi && (
              <p className="text-sm text-slate-600 leading-relaxed">
                {kegiatan.deskripsi}
              </p>
            )}
          </div>

          <div className="p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-emerald-600"
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
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Mulai Absen
                  </p>
                </div>

                <p className="text-sm font-medium text-slate-800">
                  {kegiatan.absen_mulai
                    ? formatTanggal(kegiatan.absen_mulai)
                    : "Kapan saja"}
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-red-600"
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
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Batas Akhir
                  </p>
                </div>

                <p className="text-sm font-medium text-slate-800">
                  {formatTanggal(kegiatan.deadline)}
                </p>
              </div>
            </div>

            {/* Countdown */}
            {jadwal === "belum_mulai" && kegiatan.absen_mulai && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                  Absensi dibuka dalam
                </p>

                <p className="text-lg font-bold text-amber-800 mt-1 tabular-nums">
                  {hitungCountdown(kegiatan.absen_mulai)}
                </p>
              </div>
            )}

            {jadwal === "buka" && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  Waktu absensi tersisa
                </p>

                <p className="text-lg font-bold text-emerald-800 mt-1 tabular-nums">
                  {hitungCountdown(kegiatan.deadline)}
                </p>
              </div>
            )}

            {jadwal === "tutup" && (
              <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
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
                  <p className="font-semibold text-red-700 text-sm">
                    Batas akhir absensi telah berakhir
                  </p>

                  <p className="text-xs text-red-600 mt-1">
                    Anda tidak dapat mengirim absensi untuk
                    kegiatan ini.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* FORM ABSENSI */}
        {jadwal === "buka" && (
          <section
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
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
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Form Absensi
                </h2>

                <p className="text-sm text-slate-500 mt-0.5">
                  Upload foto bukti kehadiran dan konfirmasi.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* UPLOAD FOTO */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-slate-700">
                  Foto Bukti Kehadiran{" "}
                  <span className="text-red-500">*</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFoto(e.target.files?.[0] || null)
                  }
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="relative border-2 border-emerald-300 rounded-xl overflow-hidden bg-emerald-50">
                    <img
                      src={previewUrl}
                      alt="Preview foto"
                      className="w-full h-64 object-cover"
                    />

                    <div className="absolute top-3 right-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                        className="bg-white/90 backdrop-blur-sm text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium
                                   transition-all duration-200
                                   hover:bg-white hover:shadow-md"
                      >
                        Ganti Foto
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFoto(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium
                                   transition-all duration-200
                                   hover:bg-red-700 hover:shadow-md"
                      >
                        Hapus
                      </button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                      <p className="text-white text-xs font-medium truncate">
                        {foto?.name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center
                               transition-all duration-200
                               hover:border-blue-400 hover:bg-blue-50/40
                               group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3
                                    transition-transform duration-200 group-hover:scale-110">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-7 h-7 text-blue-600"
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

                    <p className="text-sm font-semibold text-slate-700">
                      Klik untuk memilih foto
                    </p>

                    <p className="text-xs text-slate-400 mt-1">
                      Format JPG / PNG · Maksimal 4 MB
                    </p>
                  </button>
                )}
              </div>

              {/* KONFIRMASI */}
              <label
                htmlFor="konfirmasi"
                className={`flex items-start gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-all duration-200
                            ${
                              konfirmasi
                                ? "border-blue-400 bg-blue-50/50"
                                : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30"
                            }`}
              >
                <input
                  id="konfirmasi"
                  type="checkbox"
                  checked={konfirmasi}
                  onChange={(e) =>
                    setKonfirmasi(e.target.checked)
                  }
                  className="mt-0.5 w-4 h-4 accent-blue-600 flex-shrink-0"
                />

                <span className="text-sm text-slate-700 leading-relaxed">
                  Saya menyatakan bahwa saya benar-benar
                  mengikuti kegiatan ini dan foto yang saya
                  upload merupakan bukti kehadiran saya.
                </span>
              </label>

              {/* PESAN ERROR */}
              {error && (
                <div
                  className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl flex items-start gap-3"
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

              {/* PESAN SUKSES */}
              {success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-4 rounded-xl flex items-start gap-3">
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

                  <div>
                    <p className="font-medium">{success}</p>
                    <p className="text-xs text-emerald-600 mt-1">
                      Mengarahkan ke dashboard...
                    </p>
                  </div>
                </div>
              )}

              {/* TOMBOL KIRIM */}
              <button
                type="submit"
                disabled={mengirim || !!success}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold
                           py-3.5 rounded-xl
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
          </section>
        )}
      </div>
    </main>
  );
}