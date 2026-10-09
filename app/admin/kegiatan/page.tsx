"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Kegiatan = {
  id: string;
  judul: string;
  deskripsi: string | null;
  deadline: string;
  absen_mulai: string | null;
  status: string;
};

export default function KegiatanAdminPage() {
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [absenMulai, setAbsenMulai] = useState("");
  const [deadline, setDeadline] = useState("");

  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadKegiatan() {
    setLoadingData(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError(
          "Session admin tidak ditemukan. Silakan login kembali sebagai admin."
        );
        setLoadingData(false);
        return;
      }

      const { data, error } = await supabase
        .from("kegiatan")
        .select("id, judul, deskripsi, deadline, absen_mulai, status")
        .order("deadline", { ascending: true });

      if (error) {
        console.error("LOAD KEGIATAN ERROR:", error);
        setError("Gagal mengambil data kegiatan: " + error.message);
        setLoadingData(false);
        return;
      }

      setKegiatan(data || []);
    } catch (error) {
      console.error("ERROR LOAD KEGIATAN:", error);
      setError("Terjadi kesalahan saat mengambil data kegiatan.");
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    loadKegiatan();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!nama.trim()) {
      setError("Nama kegiatan wajib diisi.");
      return;
    }

    if (!deadline) {
      setError("Batas akhir absen wajib diisi.");
      return;
    }

    if (absenMulai && deadline) {
      const tglMulai = new Date(absenMulai).getTime();
      const tglDeadline = new Date(deadline).getTime();

      if (tglMulai >= tglDeadline) {
        setError(
          "Jam mulai absen harus lebih awal dari batas akhir absen."
        );
        return;
      }
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError(
          "Session admin tidak ditemukan. Silakan login kembali sebagai admin."
        );
        setLoading(false);
        return;
      }

      // ==========================================
      // KONVERSI LOCAL TIME KE UTC DI CLIENT
      // ==========================================
      // Input datetime-local menghasilkan string
      // "2026-10-13T08:00" (tanpa timezone).
      // new Date() di browser menganggapnya sebagai
      // local time (WIB). toISOString() mengubahnya
      // jadi UTC yang benar.
      const deadlineISO = new Date(deadline).toISOString();
      const absenMulaiISO = absenMulai
        ? new Date(absenMulai).toISOString()
        : null;

      const response = await fetch("/api/admin/kegiatan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          nama: nama.trim(),
          deskripsi: deskripsi.trim(),
          deadline: deadlineISO,
          absen_mulai: absenMulaiISO,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Gagal membuat kegiatan.");
        setLoading(false);
        return;
      }

      setSuccess("Kegiatan berhasil ditambahkan.");

      setNama("");
      setDeskripsi("");
      setAbsenMulai("");
      setDeadline("");

      await loadKegiatan();
    } catch (error) {
      console.error("ERROR SIMPAN KEGIATAN:", error);
      setError("Terjadi kesalahan pada sistem.");
    }

    setLoading(false);
  }

  async function handleDelete(item: Kegiatan) {
    const konfirmasi1 = window.confirm(
      `PERHATIAN!\n\nMenghapus kegiatan "${item.judul}" akan MENGHAPUS SEMUA data absensi mahasiswa yang terkait (termasuk foto bukti).\n\nData yang dihapus TIDAK DAPAT dikembalikan.\n\nLanjutkan?`
    );

    if (!konfirmasi1) return;

    const konfirmasi2 = window.confirm(
      `Konfirmasi terakhir.\n\nKetik OK untuk benar-benar menghapus kegiatan "${item.judul}" beserta seluruh absensi dan fotonya.`
    );

    if (!konfirmasi2) return;

    setError("");
    setSuccess("");
    setDeletingId(item.id);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError(
          "Session admin tidak ditemukan. Silakan login kembali sebagai admin."
        );
        setDeletingId(null);
        return;
      }

      const response = await fetch(
        `/api/admin/kegiatan/${item.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Gagal menghapus kegiatan.");
        setDeletingId(null);
        return;
      }

      setSuccess(result.message || "Kegiatan berhasil dihapus.");

      await loadKegiatan();
    } catch (error) {
      console.error("ERROR DELETE KEGIATAN:", error);
      setError("Terjadi kesalahan pada sistem.");
    }

    setDeletingId(null);
  }

  function formatTanggal(tanggal: string) {
    return new Date(tanggal).toLocaleString("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
    });
  }

  function statusLabel(status: string) {
    if (status === "active") return "Aktif";
    if (status === "closed") return "Ditutup";
    if (status === "draft") return "Draft";
    return status;
  }

  function statusBadge(status: string) {
    if (status === "active") {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }
    if (status === "closed") {
      return "bg-red-50 text-red-700 border border-red-200";
    }
    return "bg-slate-100 text-slate-700 border border-slate-200";
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* HEADER */}
        <div
          className="flex items-center justify-between"
          style={{ animation: "fadeInUp 0.4s ease-out" }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1.5 shadow-sm">
              <img
                src="/logo-unib.png"
                alt="Logo UNIB"
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">
                Kelola Kegiatan
              </h1>

              <p className="text-slate-500 mt-0.5 text-sm">
                Sistem Informasi Beasiswa Universitas Bengkulu
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              window.location.href = "/admin";
            }}
            className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium
                       transition-all duration-200
                       hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300"
          >
            ← Kembali
          </button>
        </div>

        {/* PESAN ERROR */}
        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm"
            style={{ animation: "shake 0.4s ease-in-out" }}
          >
            <p className="font-semibold">Terjadi masalah</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {/* PESAN BERHASIL */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl p-4 text-sm font-medium">
            {success}
          </div>
        )}

        {/* FORM TAMBAH KEGIATAN */}
        <div
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
          style={{ animation: "fadeInUp 0.5s ease-out" }}
        >
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>

            <h2 className="text-lg font-bold text-slate-800">
              Tambah Kegiatan
            </h2>
          </div>

          <p className="text-slate-500 text-sm mb-6 mt-1">
            Tambahkan kegiatan untuk mahasiswa penerima beasiswa.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                Nama Kegiatan
              </label>

              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Pembinaan Mahasiswa Beasiswa"
                required
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder:text-slate-400
                           transition-all duration-200
                           focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                           hover:border-slate-300"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                Deskripsi
              </label>

              <textarea
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Masukkan deskripsi kegiatan"
                rows={4}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder:text-slate-400
                           transition-all duration-200
                           focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                           hover:border-slate-300"
              />
            </div>

            {/* JADWAL ABSEN */}
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 text-blue-600"
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

                <p className="text-sm font-semibold text-blue-900">
                  Jadwal Absensi
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-sm font-semibold text-slate-700">
                    Mulai Absen
                  </label>

                  <input
                    type="datetime-local"
                    value={absenMulai}
                    onChange={(e) =>
                      setAbsenMulai(e.target.value)
                    }
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-800
                               transition-all duration-200
                               focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                               hover:border-slate-300"
                  />

                  <p className="text-xs text-slate-500 mt-1.5">
                    <b>Opsional.</b> Kalau diisi, mahasiswa hanya
                    bisa absen mulai dari waktu ini. Kalau
                    dikosongkan, absen bisa dilakukan kapan saja
                    sebelum batas akhir.
                  </p>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-semibold text-slate-700">
                    Batas Akhir Absen
                  </label>

                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-800
                               transition-all duration-200
                               focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                               hover:border-slate-300"
                  />

                  <p className="text-xs text-slate-500 mt-1.5">
                    Mahasiswa tidak dapat absen setelah waktu ini.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm
                           shadow-md shadow-blue-200
                           transition-all duration-200
                           hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-300
                           active:translate-y-0
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
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
                  "Simpan Kegiatan"
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = "/admin";
                }}
                className="bg-white text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl font-medium text-sm
                           transition-all duration-200
                           hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300"
              >
                Batal
              </button>
            </div>
          </form>
        </div>

        {/* DAFTAR KEGIATAN */}
        <div
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
          style={{ animation: "fadeInUp 0.6s ease-out" }}
        >
          <div className="flex items-center gap-3 mb-1">
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>

            <h2 className="text-lg font-bold text-slate-800">
              Daftar Kegiatan
            </h2>
          </div>

          <p className="text-slate-500 text-sm mb-6 mt-1">
            Daftar kegiatan yang sudah dibuat oleh admin.
          </p>

          {loadingData ? (
            <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500 text-sm">
              Memuat kegiatan...
            </div>
          ) : kegiatan.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500 text-sm">
              Belum ada kegiatan.
            </div>
          ) : (
            <div className="space-y-4">
              {kegiatan.map((item) => (
                <div
                  key={item.id}
                  className="border border-slate-200 rounded-xl p-5
                             transition-all duration-300
                             hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-slate-800">
                        {item.judul}
                      </h3>

                      {item.deskripsi && (
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                          {item.deskripsi}
                        </p>
                      )}

                      <div className="mt-4 grid sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            Mulai Absen
                          </p>

                          <p className="font-medium text-slate-800 text-sm mt-1">
                            {item.absen_mulai
                              ? formatTanggal(item.absen_mulai)
                              : "— (kapan saja)"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            Batas Akhir Absen
                          </p>

                          <p className="font-medium text-slate-800 text-sm mt-1">
                            {formatTanggal(item.deadline)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <span
                        className={`inline-block px-3 py-1.5 rounded-full text-xs font-medium ${statusBadge(
                          item.status
                        )}`}
                      >
                        {statusLabel(item.status)}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        className="inline-flex items-center gap-1.5 bg-red-600 text-white px-3.5 py-2 rounded-lg text-xs font-medium
                                   transition-all duration-200
                                   hover:bg-red-700 hover:-translate-y-0.5 hover:shadow-md
                                   disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                      >
                        {deletingId === item.id ? (
                          <>
                            <svg
                              className="animate-spin w-3.5 h-3.5"
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
                            Menghapus...
                          </>
                        ) : (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-3.5 h-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            Hapus
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}