"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Kegiatan = {
  id: string;
  judul: string;
  deadline: string;
  status: string;
};

type Absensi = {
  id: string;
  kegiatan_id: string;
  foto_url: string;
  konfirmasi: boolean;
  status: string;
  waktu_absen: string;
  mahasiswa: {
    nama: string;
    npm: string;
  } | null;
};

type FilterStatus =
  | "semua"
  | "pending"
  | "verified"
  | "rejected";

export default function AbsensiAdminPage() {
  const [kegiatanList, setKegiatanList] = useState<Kegiatan[]>(
    []
  );
  const [absensi, setAbsensi] = useState<Absensi[]>([]);
  const [fotoUrls, setFotoUrls] = useState<
    Record<string, string>
  >({});
  const [selectedKegiatanId, setSelectedKegiatanId] = useState<
    string | null
  >(null);
  const [filterStatus, setFilterStatus] =
    useState<FilterStatus>("semua");
  const [editingId, setEditingId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      // ==========================================
      // 1. LOAD KEGIATAN
      // ==========================================
      const { data: kegData, error: kegError } =
        await supabase
          .from("kegiatan")
          .select("id, judul, deadline, status")
          .order("deadline", { ascending: false });

      if (kegError) {
        console.error("LOAD KEGIATAN ERROR:", kegError);
        setError(
          "Gagal mengambil data kegiatan: " + kegError.message
        );
        return;
      }

      setKegiatanList(kegData || []);

      // ==========================================
      // 2. LOAD SEMUA ABSENSI
      // ==========================================
      const { data: absData, error: absError } =
        await supabase
          .from("absensi")
          .select(`
            id,
            kegiatan_id,
            foto_url,
            konfirmasi,
            status,
            waktu_absen,
            mahasiswa (
              nama,
              npm
            )
          `)
          .order("waktu_absen", { ascending: false });

      if (absError) {
        console.error("LOAD ABSENSI ERROR:", absError);
        setError(
          "Gagal mengambil data absensi: " + absError.message
        );
        return;
      }

      const list = (absData || []) as unknown as Absensi[];
      setAbsensi(list);

      // ==========================================
      // 3. SIGNED URL FOTO
      // ==========================================
      const paths = list
        .map((a) => a.foto_url)
        .filter(
          (p) => typeof p === "string" && p.length > 0
        );

      if (paths.length === 0) {
        setFotoUrls({});
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.error(
          "Sesi admin tidak ditemukan untuk ambil foto."
        );
        return;
      }

      const fotoRes = await fetch(
        "/api/admin/absensi/foto-url",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ paths }),
        }
      );

      const fotoResult = await fotoRes.json();

      if (!fotoRes.ok) {
        console.error("FOTO URL ERROR:", fotoResult.error);
        return;
      }

      setFotoUrls(fotoResult.urls || {});
    } catch (err) {
      console.error("ERROR:", err);
      setError(
        "Terjadi kesalahan saat mengambil data absensi."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function verifikasiAbsensi(id: string) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert("Sesi login admin tidak ditemukan.");
        return;
      }

      const response = await fetch(
        "/api/admin/absensi/verifikasi",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            attendance_id: id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Gagal memverifikasi absensi.");
        return;
      }

      alert("Absensi berhasil diverifikasi.");

      setEditingId(null);
      await loadData();
    } catch (error) {
      console.error("VERIFIKASI ABSENSI ERROR:", error);
      alert("Terjadi kesalahan saat memverifikasi absensi.");
    }
  }

  async function tolakAbsensi(id: string) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        alert("Sesi login admin tidak ditemukan.");
        return;
      }

      const response = await fetch(
        "/api/admin/absensi/tolak",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            attendance_id: id,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Gagal menolak absensi.");
        return;
      }

      alert("Absensi berhasil ditolak.");

      setEditingId(null);
      await loadData();
    } catch (error) {
      console.error("TOLAK ABSENSI ERROR:", error);
      alert("Terjadi kesalahan saat menolak absensi.");
    }
  }

  function formatTanggal(tanggal: string) {
    return new Date(tanggal).toLocaleString("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
    });
  }

  function statusLabel(status: string) {
    if (status === "pending") return "Menunggu Verifikasi";
    if (status === "verified") return "Terverifikasi";
    if (status === "rejected") return "Ditolak";
    return status;
  }

  function statusBadge(status: string) {
    if (status === "pending") {
      return "bg-amber-50 text-amber-700 border border-amber-200";
    }
    if (status === "verified") {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }
    if (status === "rejected") {
      return "bg-red-50 text-red-700 border border-red-200";
    }
    return "bg-slate-100 text-slate-700 border border-slate-200";
  }

  function kegiatanStatusLabel(status: string) {
    if (status === "active") return "Aktif";
    if (status === "closed") return "Ditutup";
    if (status === "draft") return "Draft";
    return status;
  }

  function kegiatanStatusBadge(status: string) {
    if (status === "active") {
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    }
    if (status === "closed") {
      return "bg-red-50 text-red-700 border border-red-200";
    }
    return "bg-slate-100 text-slate-700 border border-slate-200";
  }

  // ==========================================
  // HITUNG JUMLAH ABSENSI PER KEGIATAN
  // ==========================================
  const countsByKegiatan = useMemo(() => {
    const map: Record<
      string,
      {
        total: number;
        pending: number;
        verified: number;
        rejected: number;
      }
    > = {};

    absensi.forEach((a) => {
      if (!map[a.kegiatan_id]) {
        map[a.kegiatan_id] = {
          total: 0,
          pending: 0,
          verified: 0,
          rejected: 0,
        };
      }

      map[a.kegiatan_id].total += 1;

      if (a.status === "pending")
        map[a.kegiatan_id].pending += 1;
      if (a.status === "verified")
        map[a.kegiatan_id].verified += 1;
      if (a.status === "rejected")
        map[a.kegiatan_id].rejected += 1;
    });

    return map;
  }, [absensi]);

  const selectedKegiatan = useMemo(
    () =>
      kegiatanList.find((k) => k.id === selectedKegiatanId) ||
      null,
    [kegiatanList, selectedKegiatanId]
  );

  const absensiTampil = useMemo(() => {
    if (!selectedKegiatanId) return [];

    const filtered = absensi.filter(
      (a) => a.kegiatan_id === selectedKegiatanId
    );

    if (filterStatus === "semua") return filtered;

    return filtered.filter((a) => a.status === filterStatus);
  }, [absensi, selectedKegiatanId, filterStatus]);

  const absensiKegiatanIni = useMemo(() => {
    if (!selectedKegiatanId) return [];
    return absensi.filter(
      (a) => a.kegiatan_id === selectedKegiatanId
    );
  }, [absensi, selectedKegiatanId]);

  function handleBukaKegiatan(id: string) {
    setSelectedKegiatanId(id);
    setFilterStatus("semua");
    setEditingId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleKembaliKeDaftar() {
    setSelectedKegiatanId(null);
    setFilterStatus("semua");
    setEditingId(null);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
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
                Data Absensi
              </h1>

              <p className="text-slate-500 mt-0.5 text-sm">
                Data absensi mahasiswa KIP Kuliah
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

        {/* ERROR */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
            <p className="font-semibold">Terjadi masalah</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {/* ========================================== */}
        {/* MODE 1: DAFTAR KEGIATAN */}
        {/* ========================================== */}
        {!selectedKegiatanId && (
          <div
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
            style={{ animation: "fadeInUp 0.5s ease-out" }}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
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
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Pilih Kegiatan
                  </h2>

                  <p className="text-slate-500 text-sm mt-0.5">
                    Klik kegiatan untuk melihat daftar absensi
                    mahasiswa.
                  </p>
                </div>
              </div>

              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium
                           transition-all duration-200
                           hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300
                           disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`w-4 h-4 ${
                    loading ? "animate-spin" : ""
                  }`}
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

                {loading ? "Memuat..." : "Refresh"}
              </button>
            </div>

            {loading ? (
              <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500 text-sm">
                Memuat daftar kegiatan...
              </div>
            ) : kegiatanList.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500 text-sm">
                Belum ada kegiatan. Tambahkan kegiatan di menu{" "}
                <b>Kelola Kegiatan</b> terlebih dahulu.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                {kegiatanList.map((keg) => {
                  const counts = countsByKegiatan[keg.id] || {
                    total: 0,
                    pending: 0,
                    verified: 0,
                    rejected: 0,
                  };

                  return (
                    <button
                      key={keg.id}
                      onClick={() => handleBukaKegiatan(keg.id)}
                      className="text-left border border-slate-200 rounded-2xl p-5 bg-white
                                 transition-all duration-300 ease-out
                                 hover:-translate-y-1 hover:shadow-lg hover:border-blue-300
                                 group"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="text-base font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                          {keg.judul}
                        </h3>

                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${kegiatanStatusBadge(
                            keg.status
                          )}`}
                        >
                          {kegiatanStatusLabel(keg.status)}
                        </span>
                      </div>

                      <div className="mb-4">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Deadline
                        </p>

                        <p className="text-sm text-slate-700 mt-0.5">
                          {formatTanggal(keg.deadline)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                        <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full text-xs font-medium">
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
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {counts.total} absensi
                        </span>

                        {counts.pending > 0 && (
                          <span className="inline-block bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-medium">
                            {counts.pending} menunggu
                          </span>
                        )}

                        {counts.verified > 0 && (
                          <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-medium">
                            {counts.verified} terverifikasi
                          </span>
                        )}

                        {counts.rejected > 0 && (
                          <span className="inline-block bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-xs font-medium">
                            {counts.rejected} ditolak
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex items-center gap-1 text-sm font-medium text-blue-600
                                      transition-all duration-200 group-hover:gap-2">
                        Lihat Absensi
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
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* MODE 2: DETAIL KEGIATAN */}
        {/* ========================================== */}
        {selectedKegiatanId && selectedKegiatan && (
          <div
            className="space-y-6"
            style={{ animation: "fadeInUp 0.4s ease-out" }}
          >
            {/* Tombol kembali */}
            <button
              onClick={handleKembaliKeDaftar}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm
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
              Kembali ke Daftar Kegiatan
            </button>

            {/* Info kegiatan */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {selectedKegiatan.judul}
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    Deadline:{" "}
                    {formatTanggal(selectedKegiatan.deadline)}
                  </p>
                </div>

                <span
                  className={`inline-block w-fit px-3 py-1.5 rounded-full text-xs font-medium ${kegiatanStatusBadge(
                    selectedKegiatan.status
                  )}`}
                >
                  {kegiatanStatusLabel(selectedKegiatan.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
                <div className="text-center md:text-left">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Total
                  </p>
                  <p className="text-lg font-bold text-slate-800 mt-0.5">
                    {absensiKegiatanIni.length}
                  </p>
                </div>

                <div className="text-center md:text-left">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                    Menunggu
                  </p>
                  <p className="text-lg font-bold text-amber-700 mt-0.5">
                    {
                      absensiKegiatanIni.filter(
                        (a) => a.status === "pending"
                      ).length
                    }
                  </p>
                </div>

                <div className="text-center md:text-left">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                    Terverifikasi
                  </p>
                  <p className="text-lg font-bold text-emerald-700 mt-0.5">
                    {
                      absensiKegiatanIni.filter(
                        (a) => a.status === "verified"
                      ).length
                    }
                  </p>
                </div>

                <div className="text-center md:text-left">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                    Ditolak
                  </p>
                  <p className="text-lg font-bold text-red-700 mt-0.5">
                    {
                      absensiKegiatanIni.filter(
                        (a) => a.status === "rejected"
                      ).length
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Filter status */}
            <div className="flex flex-wrap gap-2">
              {(
                [
                  {
                    key: "semua",
                    label: "Semua",
                    count: absensiKegiatanIni.length,
                  },
                  {
                    key: "pending",
                    label: "Menunggu",
                    count: absensiKegiatanIni.filter(
                      (a) => a.status === "pending"
                    ).length,
                  },
                  {
                    key: "verified",
                    label: "Terverifikasi",
                    count: absensiKegiatanIni.filter(
                      (a) => a.status === "verified"
                    ).length,
                  },
                  {
                    key: "rejected",
                    label: "Ditolak",
                    count: absensiKegiatanIni.filter(
                      (a) => a.status === "rejected"
                    ).length,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterStatus(tab.key)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border
                              transition-all duration-200
                              ${
                                filterStatus === tab.key
                                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:-translate-y-0.5 hover:shadow-md"
                              }`}
                >
                  {tab.label}
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                      filterStatus === tab.key
                        ? "bg-white/25 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Daftar absensi */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-800">
                      Daftar Absensi
                    </h2>

                    <p className="text-slate-500 text-sm mt-0.5">
                      {absensiTampil.length} data ditampilkan.
                    </p>
                  </div>
                </div>

                <button
                  onClick={loadData}
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium
                             transition-all duration-200
                             hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300
                             disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-4 h-4 ${
                      loading ? "animate-spin" : ""
                    }`}
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

                  {loading ? "Memuat..." : "Refresh"}
                </button>
              </div>

              {loading ? (
                <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500 text-sm">
                  Memuat data absensi...
                </div>
              ) : absensiTampil.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500 text-sm">
                  {absensiKegiatanIni.length === 0
                    ? "Belum ada mahasiswa yang absen untuk kegiatan ini."
                    : "Tidak ada absensi dengan status yang dipilih."}
                </div>
              ) : (
                <div className="space-y-5">
                  {absensiTampil.map((item) => {
                    const signedUrl = fotoUrls[item.foto_url];
                    const isEditing = editingId === item.id;
                    const showAksi =
                      item.status === "pending" || isEditing;

                    return (
                      <div
                        key={item.id}
                        className="border border-slate-200 rounded-2xl p-5
                                   transition-all duration-300
                                   hover:border-blue-200 hover:shadow-md"
                      >
                        <div className="flex flex-col lg:flex-row gap-6">
                          {/* FOTO */}
                          <div className="w-full lg:w-56">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                              Foto Absensi
                            </p>

                            {signedUrl ? (
                              <a
                                href={signedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block group"
                              >
                                <img
                                  src={signedUrl}
                                  alt="Foto absensi mahasiswa"
                                  className="w-full h-48 object-cover rounded-xl border border-slate-200
                                             transition-transform duration-300
                                             group-hover:scale-[1.02] group-hover:shadow-lg"
                                />
                              </a>
                            ) : (
                              <div className="h-48 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-sm text-center px-3 border border-dashed border-slate-200">
                                {item.foto_url
                                  ? "Memuat foto..."
                                  : "Tidak ada foto"}
                              </div>
                            )}
                          </div>

                          {/* INFORMASI */}
                          <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                              <div>
                                <h3 className="text-lg font-bold text-slate-800">
                                  {item.mahasiswa?.nama ||
                                    "Nama tidak ditemukan"}
                                </h3>

                                <p className="text-slate-500 text-sm font-mono mt-0.5">
                                  NPM: {item.mahasiswa?.npm || "-"}
                                </p>
                              </div>

                              <span
                                className={`inline-block w-fit px-3 py-1.5 rounded-full text-xs font-medium ${statusBadge(
                                  item.status
                                )}`}
                              >
                                {statusLabel(item.status)}
                              </span>
                            </div>

                            <div className="mt-5 grid md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                  Waktu Absensi
                                </p>

                                <p className="font-medium text-slate-800 mt-1 text-sm">
                                  {formatTanggal(item.waktu_absen)}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                  Konfirmasi Mahasiswa
                                </p>

                                <p className="font-medium text-slate-800 mt-1 text-sm">
                                  {item.konfirmasi
                                    ? "Sudah dikonfirmasi"
                                    : "Belum dikonfirmasi"}
                                </p>
                              </div>
                            </div>

                            {/* TOMBOL AKSI */}
                            {showAksi ? (
                              <div className="mt-5 flex flex-wrap gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    verifikasiAbsensi(item.id)
                                  }
                                  disabled={
                                    item.status === "verified"
                                  }
                                  className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium text-sm
                                             transition-all duration-200
                                             hover:bg-emerald-700 hover:-translate-y-0.5 hover:shadow-md
                                             disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
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
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                  Verifikasi
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    tolakAbsensi(item.id)
                                  }
                                  disabled={
                                    item.status === "rejected"
                                  }
                                  className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-medium text-sm
                                             transition-all duration-200
                                             hover:bg-red-700 hover:-translate-y-0.5 hover:shadow-md
                                             disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
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
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                  Tolak
                                </button>

                                {isEditing && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditingId(null)
                                    }
                                    className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl font-medium text-sm
                                               transition-all duration-200
                                               hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300"
                                  >
                                    Batal
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="mt-5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingId(item.id)
                                  }
                                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium text-sm
                                             transition-all duration-200
                                             hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md"
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
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                  Ubah
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}