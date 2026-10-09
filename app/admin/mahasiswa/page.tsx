"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

type HasilImport = {
  baris: number;
  npm: string;
  status: "berhasil" | "gagal";
  alasan?: string;
};

type Mahasiswa = {
  id: string;
  nama: string;
  npm: string;
  fakultas: string | null;
  prodi: string | null;
  angkatan: number | null;
  nama_beasiswa: string | null;
  keterangan: string | null;
  must_change_password: boolean;
};

// ==========================================
// UKURAN BATCH
// 25 baris × ~0,7 detik = ~18 detik per batch
// Aman di bawah maxDuration 60 detik
// ==========================================
const BATCH_SIZE = 25;

// Jeda kecil antar batch (ms) — menghindari rate limit
const JEDA_ANTAR_BATCH = 200;

export default function AdminMahasiswaPage() {
  const router = useRouter();

  // Form tambah mahasiswa
  const [npm, setNpm] = useState("");
  const [nama, setNama] = useState("");
  const [fakultas, setFakultas] = useState("");
  const [prodi, setProdi] = useState("");
  const [angkatan, setAngkatan] = useState("");

  // Form reset password
  const [npmReset, setNpmReset] = useState("");

  const [loadingTambah, setLoadingTambah] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const [errorTambah, setErrorTambah] = useState("");
  const [successTambah, setSuccessTambah] = useState("");

  const [errorReset, setErrorReset] = useState("");
  const [successReset, setSuccessReset] = useState("");

  // Import Excel
  const [loadingImport, setLoadingImport] = useState(false);
  const [errorImport, setErrorImport] = useState("");
  const [hasilImport, setHasilImport] = useState<{
    berhasil: number;
    gagal: number;
    detail: HasilImport[];
  } | null>(null);

  // Progress batch
  const [progress, setProgress] = useState<{
    batch: number;
    totalBatches: number;
    selesai: number;
    total: number;
  } | null>(null);

  // Daftar mahasiswa
  const [daftarMahasiswa, setDaftarMahasiswa] = useState<
    Mahasiswa[]
  >([]);
  const [loadingDaftar, setLoadingDaftar] = useState(true);
  const [errorDaftar, setErrorDaftar] = useState("");
  const [cari, setCari] = useState("");

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadDaftarMahasiswa() {
    setLoadingDaftar(true);
    setErrorDaftar("");

    try {
      const token = await getToken();

      if (!token) {
        router.push("/admin/login");
        return;
      }

      const res = await fetch("/api/admin/mahasiswa", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json();

      if (!res.ok) {
        setErrorDaftar(
          result.error || "Gagal memuat daftar mahasiswa."
        );
        return;
      }

      setDaftarMahasiswa(result.mahasiswa || []);
    } catch (error) {
      console.error(error);
      setErrorDaftar(
        "Terjadi kesalahan saat memuat daftar mahasiswa."
      );
    } finally {
      setLoadingDaftar(false);
    }
  }

  useEffect(() => {
    loadDaftarMahasiswa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTambahMahasiswa(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setErrorTambah("");
    setSuccessTambah("");

    if (!npm.trim() || !nama.trim()) {
      setErrorTambah("NPM dan nama mahasiswa wajib diisi.");
      return;
    }

    if (!angkatan.trim() || isNaN(Number(angkatan))) {
      setErrorTambah("Angkatan wajib diisi berupa angka.");
      return;
    }

    setLoadingTambah(true);

    try {
      const token = await getToken();

      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch("/api/admin/mahasiswa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          npm: npm.trim(),
          nama: nama.trim(),
          fakultas: fakultas.trim(),
          prodi: prodi.trim(),
          angkatan: Number(angkatan),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorTambah(
          result.error || "Gagal menambahkan mahasiswa."
        );
        return;
      }

      const emailLogin = `${npm.trim()}@kip.unib.ac.id`;

      setSuccessTambah(
        `Mahasiswa ${result.mahasiswa?.nama || nama} berhasil ditambahkan.\n` +
          `Email login: ${emailLogin}\n` +
          `Password awal: 812800\n` +
          `Mahasiswa akan diminta mengganti password saat login pertama.`
      );

      setNpm("");
      setNama("");
      setFakultas("");
      setProdi("");
      setAngkatan("");

      await loadDaftarMahasiswa();
    } catch (error) {
      console.error(error);
      setErrorTambah("Terjadi kesalahan pada sistem.");
    } finally {
      setLoadingTambah(false);
    }
  }

  async function resetPasswordByNpm(npmTarget: string) {
    setErrorReset("");
    setSuccessReset("");

    if (!npmTarget.trim()) {
      setErrorReset("NPM mahasiswa wajib diisi.");
      return;
    }

    setLoadingReset(true);

    try {
      const token = await getToken();

      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          npm: npmTarget.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorReset(
          result.error || "Gagal mereset password."
        );
        return;
      }

      setSuccessReset(
        `Password ${
          result.mahasiswa?.nama || "mahasiswa"
        } berhasil direset. Password sementara: ${
          result.passwordSementara || "812800"
        }`
      );

      setNpmReset("");
    } catch (error) {
      console.error(error);
      setErrorReset("Terjadi kesalahan pada sistem.");
    } finally {
      setLoadingReset(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    await resetPasswordByNpm(npmReset);
  }

  async function handleResetFromTable(npmTarget: string) {
    const konfirmasi = window.confirm(
      `Reset password mahasiswa dengan NPM ${npmTarget}? Password akan menjadi 812800.`
    );

    if (!konfirmasi) return;

    await resetPasswordByNpm(npmTarget);
  }

  function handleDownloadTemplate() {
    const header = [
      "NO",
      "NIM",
      "NAMA LENGKAP",
      "ANGKATAN",
      "FAKULTAS",
      "PROGRAM STUDI",
      "NAMA BEASISWA",
      "KETERANGAN",
    ];

    const contoh = [
      [
        1,
        "G1D12345678",
        "Budi Santoso",
        2024,
        "Fakultas Teknik",
        "Informatika",
        "KIP Kuliah",
        "Penerima KIP tahun 2024",
      ],
      [
        2,
        "G1D12345679",
        "Siti Aminah",
        2024,
        "Fakultas MIPA",
        "Matematika",
        "KIP Kuliah",
        "",
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([
      header,
      ...contoh,
    ]);

    worksheet["!cols"] = [
      { wch: 5 },
      { wch: 16 },
      { wch: 28 },
      { wch: 10 },
      { wch: 24 },
      { wch: 24 },
      { wch: 20 },
      { wch: 30 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Template Mahasiswa"
    );

    XLSX.writeFile(workbook, "template-mahasiswa-kip.xlsx");
  }

  // ==========================================
  // IMPORT EXCEL — BATCH
  // ==========================================
  async function handleFileImport(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    setErrorImport("");
    setHasilImport(null);
    setProgress(null);

    const file = e.target.files?.[0];

    if (!file) return;

    e.target.value = "";

    try {
      // ==========================================
      // 1. BACA FILE EXCEL
      // ==========================================
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, {
        type: "array",
      });

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        setErrorImport("File Excel tidak memiliki sheet.");
        return;
      }

      const worksheet = workbook.Sheets[sheetName];

      const raw: unknown[][] = XLSX.utils.sheet_to_json(
        worksheet,
        {
          header: 1,
          blankrows: false,
          defval: "",
        }
      );

      if (raw.length < 2) {
        setErrorImport(
          "File Excel hanya berisi header, tidak ada data."
        );
        return;
      }

      const headerRow = (raw[0] as unknown[]).map((h) =>
        String(h ?? "").trim().toUpperCase()
      );

      const findIndex = (nama: string) =>
        headerRow.findIndex(
          (h) => h === nama.toUpperCase()
        );

      const idxNim = findIndex("NIM");
      const idxNama = findIndex("NAMA LENGKAP");
      const idxAngkatan = findIndex("ANGKATAN");
      const idxFakultas = findIndex("FAKULTAS");
      const idxProdi = findIndex("PROGRAM STUDI");
      const idxBeasiswa = findIndex("NAMA BEASISWA");
      const idxKeterangan = findIndex("KETERANGAN");

      if (idxNim === -1) {
        setErrorImport(
          "Kolom 'NIM' tidak ditemukan di baris header."
        );
        return;
      }

      if (idxNama === -1) {
        setErrorImport(
          "Kolom 'NAMA LENGKAP' tidak ditemukan di baris header."
        );
        return;
      }

      if (idxAngkatan === -1) {
        setErrorImport(
          "Kolom 'ANGKATAN' tidak ditemukan di baris header."
        );
        return;
      }

      const rows = raw.slice(1).map((baris) => {
        const b = baris as unknown[];

        const ambil = (i: number) =>
          i >= 0 ? String(b[i] ?? "").trim() : "";

        return {
          npm: ambil(idxNim),
          nama: ambil(idxNama),
          angkatan: Number(ambil(idxAngkatan)),
          fakultas: ambil(idxFakultas),
          prodi: ambil(idxProdi),
          nama_beasiswa: ambil(idxBeasiswa),
          keterangan: ambil(idxKeterangan),
        };
      });

      const rowsBersih = rows.filter(
        (r) =>
          r.npm ||
          r.nama ||
          !isNaN(r.angkatan) ||
          r.fakultas ||
          r.prodi ||
          r.nama_beasiswa ||
          r.keterangan
      );

      if (rowsBersih.length === 0) {
        setErrorImport(
          "Tidak ada data yang bisa diproses dari file Excel."
        );
        return;
      }

      // ==========================================
      // 2. KIRIM PER BATCH
      // ==========================================
      const token = await getToken();

      if (!token) {
        router.push("/admin/login");
        return;
      }

      const totalBatches = Math.ceil(
        rowsBersih.length / BATCH_SIZE
      );

      setLoadingImport(true);
      setProgress({
        batch: 0,
        totalBatches,
        selesai: 0,
        total: rowsBersih.length,
      });

      const semuaDetail: HasilImport[] = [];
      let totalBerhasil = 0;
      let totalGagal = 0;

      for (
        let i = 0;
        i < rowsBersih.length;
        i += BATCH_SIZE
      ) {
        const batchRows = rowsBersih.slice(
          i,
          i + BATCH_SIZE
        );

        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

        try {
          const res = await fetch(
            "/api/admin/mahasiswa/import",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                rows: batchRows,
              }),
            }
          );

          const result = await res.json();

          if (!res.ok) {
            // Batch gagal total — tandai semua baris di batch ini gagal
            batchRows.forEach((r, idx) => {
              semuaDetail.push({
                baris: i + idx + 1,
                npm: r.npm,
                status: "gagal",
                alasan:
                  result.error ||
                  "Batch gagal diproses di server.",
              });
              totalGagal++;
            });
          } else {
            totalBerhasil += result.berhasil ?? 0;
            totalGagal += result.gagal ?? 0;

            (result.detail || []).forEach(
              (d: HasilImport) => {
                semuaDetail.push({
                  ...d,
                  baris: i + d.baris,
                });
              }
            );
          }
        } catch (err) {
          console.error(
            `Batch ${batchNumber} error:`,
            err
          );

          batchRows.forEach((r, idx) => {
            semuaDetail.push({
              baris: i + idx + 1,
              npm: r.npm,
              status: "gagal",
              alasan:
                "Koneksi ke server gagal. Coba upload ulang nanti.",
            });
            totalGagal++;
          });
        }

        setProgress({
          batch: batchNumber,
          totalBatches,
          selesai: Math.min(
            i + BATCH_SIZE,
            rowsBersih.length
          ),
          total: rowsBersih.length,
        });

        // Jeda kecil antar batch
        if (i + BATCH_SIZE < rowsBersih.length) {
          await new Promise((r) =>
            setTimeout(r, JEDA_ANTAR_BATCH)
          );
        }
      }

      // ==========================================
      // 3. SELESAI
      // ==========================================
      setHasilImport({
        berhasil: totalBerhasil,
        gagal: totalGagal,
        detail: semuaDetail,
      });

      await loadDaftarMahasiswa();
    } catch (error) {
      console.error(error);
      setErrorImport(
        "Terjadi kesalahan saat membaca file Excel. Pastikan file berformat .xlsx atau .xls."
      );
    } finally {
      setLoadingImport(false);
      setProgress(null);
    }
  }

  const daftarFilter = daftarMahasiswa.filter((m) => {
    const keyword = cari.trim().toLowerCase();

    if (!keyword) return true;

    return (
      m.npm.toLowerCase().includes(keyword) ||
      m.nama.toLowerCase().includes(keyword)
    );
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
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
                Data Mahasiswa
              </h1>

              <p className="text-slate-500 mt-0.5 text-sm">
                Menambah mahasiswa dan mengatur password akun.
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push("/admin")}
            className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium
                       transition-all duration-200
                       hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300"
          >
            ← Kembali
          </button>
        </div>

        {/* Import Excel */}
        <div
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
          style={{ animation: "fadeInUp 0.5s ease-out" }}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            <h2 className="text-lg font-bold text-slate-800">
              Import Data Mahasiswa dari Excel
            </h2>
          </div>

          <p className="text-slate-500 text-sm mb-6 mt-1">
            Tambah banyak mahasiswa sekaligus dari file Excel
            (.xlsx / .xls). Mendukung file besar (ribuan
            baris).
          </p>

          <div className="flex flex-wrap gap-3 mb-5">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm
                         transition-all duration-200
                         hover:bg-emerald-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-200"
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download Template
            </button>

            <label
              className={`inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm cursor-pointer
                          transition-all duration-200
                          hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-200
                          ${
                            loadingImport
                              ? "opacity-50 cursor-not-allowed hover:translate-y-0"
                              : ""
                          }`}
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>

              {loadingImport
                ? "Mengimport..."
                : "Pilih File Excel"}

              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileImport}
                disabled={loadingImport}
                className="hidden"
              />
            </label>
          </div>

          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 text-sm text-blue-900">
            <p className="font-semibold mb-2">
              Ketentuan file Excel:
            </p>

            <ul className="list-disc list-inside space-y-1 text-blue-800/90">
              <li>
                Baris pertama = header (NO, NIM, NAMA LENGKAP,
                ANGKATAN, FAKULTAS, PROGRAM STUDI, NAMA
                BEASISWA, KETERANGAN).
              </li>

              <li>
                Kolom <b>NIM</b>, <b>NAMA LENGKAP</b>, dan{" "}
                <b>ANGKATAN</b> wajib diisi.
              </li>

              <li>
                Password awal setiap mahasiswa baru:{" "}
                <b>812800</b>.
              </li>

              <li>
                Email login otomatis:{" "}
                <b>&lt;NIM&gt;@kip.unib.ac.id</b>.
              </li>

              <li>
                NIM yang <b>sudah terdaftar akan dilewati</b>{" "}
                (tidak dobel, tidak ditimpa).
              </li>

              <li>
                Untuk file besar (ribuan baris), biarkan tab
                ini terbuka sampai proses selesai (
                <b>jangan tutup browser</b>).
              </li>
            </ul>
          </div>

          {/* PROGRESS BAR */}
          {progress && (
            <div className="mt-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-blue-800 text-sm">
                  Sedang mengimpor...
                </p>

                <p className="text-xs text-blue-700 font-mono">
                  Batch {progress.batch}/{progress.totalBatches}
                </p>
              </div>

              <div className="w-full h-3 bg-blue-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
                  style={{
                    width: `${
                      progress.total > 0
                        ? (progress.selesai / progress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>

              <p className="text-xs text-blue-700 mt-2">
                {progress.selesai} / {progress.total} baris
                {" "}
                (
                {progress.total > 0
                  ? Math.round(
                      (progress.selesai / progress.total) * 100
                    )
                  : 0}
                %)
              </p>

              <p className="text-xs text-blue-600 mt-2 italic">
                ⚠️ Jangan tutup tab ini sampai proses selesai.
                Kalau terputus, upload ulang file yang sama —
                baris yang sudah masuk akan otomatis
                dilewati.
              </p>
            </div>
          )}

          {errorImport && (
            <div className="mt-5 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">
              {errorImport}
            </div>
          )}

          {hasilImport && (
            <div className="mt-5 space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4">
                <p className="font-semibold">
                  Import selesai.
                </p>

                <p className="mt-1 text-sm">
                  Berhasil: <b>{hasilImport.berhasil}</b> |
                  Gagal: <b>{hasilImport.gagal}</b>
                </p>
              </div>

              {hasilImport.detail.length > 0 && (
                <details className="border border-slate-200 rounded-xl overflow-hidden">
                  <summary className="bg-slate-50 px-4 py-3 cursor-pointer text-sm font-semibold text-slate-700 hover:bg-slate-100">
                    Lihat rincian per baris (
                    {hasilImport.detail.length} baris)
                  </summary>

                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-600">
                            Baris
                          </th>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-600">
                            NPM
                          </th>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-600">
                            Status
                          </th>
                          <th className="text-left px-3 py-2.5 font-semibold text-slate-600">
                            Alasan
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {hasilImport.detail.map((d, idx) => (
                          <tr
                            key={idx}
                            className="border-t border-slate-100"
                          >
                            <td className="px-3 py-2.5 text-slate-700">
                              {d.baris}
                            </td>

                            <td className="px-3 py-2.5 font-mono text-slate-700">
                              {d.npm || "-"}
                            </td>

                            <td
                              className={`px-3 py-2.5 font-medium ${
                                d.status === "berhasil"
                                  ? "text-emerald-700"
                                  : "text-red-700"
                              }`}
                            >
                              {d.status === "berhasil"
                                ? "Berhasil"
                                : "Gagal"}
                            </td>

                            <td className="px-3 py-2.5 text-slate-500">
                              {d.alasan || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Tambah Mahasiswa */}
        <div
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
          style={{ animation: "fadeInUp 0.6s ease-out" }}
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
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>

            <h2 className="text-lg font-bold text-slate-800">
              Tambah Mahasiswa
            </h2>
          </div>

          <p className="text-slate-500 text-sm mb-6 mt-1">
            Buat akun mahasiswa KIP Kuliah baru (satu per
            satu).
          </p>

          <form
            onSubmit={handleTambahMahasiswa}
            className="space-y-5"
          >
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block mb-2 text-sm font-semibold text-slate-700">
                  NPM
                </label>

                <input
                  type="text"
                  value={npm}
                  onChange={(e) => setNpm(e.target.value)}
                  placeholder="Contoh: G1D12345678"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder:text-slate-400
                             transition-all duration-200
                             focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                             hover:border-slate-300"
                />

                <p className="text-xs text-slate-400 mt-1.5">
                  Email login otomatis:{" "}
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded">
                    npm@kip.unib.ac.id
                  </code>
                </p>
              </div>

              <div>
                <label className="block mb-2 text-sm font-semibold text-slate-700">
                  Nama Mahasiswa
                </label>

                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder:text-slate-400
                             transition-all duration-200
                             focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                             hover:border-slate-300"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-semibold text-slate-700">
                  Fakultas
                </label>

                <input
                  type="text"
                  value={fakultas}
                  onChange={(e) =>
                    setFakultas(e.target.value)
                  }
                  placeholder="Contoh: Fakultas Teknik"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder:text-slate-400
                             transition-all duration-200
                             focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                             hover:border-slate-300"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-semibold text-slate-700">
                  Program Studi
                </label>

                <input
                  type="text"
                  value={prodi}
                  onChange={(e) => setProdi(e.target.value)}
                  placeholder="Contoh: Informatika"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder:text-slate-400
                             transition-all duration-200
                             focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                             hover:border-slate-300"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-semibold text-slate-700">
                  Angkatan
                </label>

                <input
                  type="number"
                  value={angkatan}
                  onChange={(e) =>
                    setAngkatan(e.target.value)
                  }
                  placeholder="Contoh: 2024"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder:text-slate-400
                             transition-all duration-200
                             focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                             hover:border-slate-300"
                />
              </div>
            </div>

            {errorTambah && (
              <div
                className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl whitespace-pre-line"
                style={{ animation: "shake 0.4s ease-in-out" }}
              >
                {errorTambah}
              </div>
            )}

            {successTambah && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3 rounded-xl whitespace-pre-line">
                {successTambah}
              </div>
            )}

            <button
              type="submit"
              disabled={loadingTambah}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm
                         shadow-md shadow-blue-200
                         transition-all duration-200
                         hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-300
                         active:translate-y-0
                         disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0
                         inline-flex items-center gap-2"
            >
              {loadingTambah ? (
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
                "Tambah Mahasiswa"
              )}
            </button>
          </form>
        </div>

        {/* Daftar Mahasiswa */}
        <div
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
          style={{ animation: "fadeInUp 0.7s ease-out" }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Daftar Mahasiswa
              </h2>

              <p className="text-slate-500 mt-0.5 text-sm">
                Total:{" "}
                <b className="text-slate-700">
                  {daftarMahasiswa.length}
                </b>{" "}
                mahasiswa terdaftar.
              </p>
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>

                <input
                  type="text"
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                  placeholder="Cari NPM / nama..."
                  className="border-2 border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm w-full md:w-64
                             transition-all duration-200
                             focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                             hover:border-slate-300"
                />
              </div>

              <button
                onClick={loadDaftarMahasiswa}
                disabled={loadingDaftar}
                className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium
                           transition-all duration-200
                           hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300
                           disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loadingDaftar ? "Memuat..." : "Refresh"}
              </button>
            </div>
          </div>

          {errorDaftar && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-4 text-sm">
              {errorDaftar}
            </div>
          )}

          {loadingDaftar ? (
            <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500 text-sm">
              Memuat daftar mahasiswa...
            </div>
          ) : daftarFilter.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500 text-sm">
              {daftarMahasiswa.length === 0
                ? "Belum ada mahasiswa terdaftar."
                : "Tidak ada mahasiswa yang cocok dengan pencarian."}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6 max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
                    <th className="py-3 pr-3">NPM</th>
                    <th className="py-3 pr-3">Nama</th>
                    <th className="py-3 pr-3">
                      Fakultas / Prodi
                    </th>
                    <th className="py-3 pr-3">Angkatan</th>
                    <th className="py-3 pr-3">Beasiswa</th>
                    <th className="py-3 text-right">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {daftarFilter.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-slate-100 align-top
                                 transition-colors duration-150 hover:bg-slate-50"
                    >
                      <td className="py-3.5 pr-3 font-mono text-slate-700 text-xs">
                        {m.npm}
                      </td>

                      <td className="py-3.5 pr-3">
                        <div className="font-medium text-slate-800">
                          {m.nama}
                        </div>

                        {m.keterangan && (
                          <div className="text-xs text-slate-500 mt-1">
                            {m.keterangan}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 pr-3 text-slate-600 text-xs">
                        <div>{m.fakultas || "-"}</div>
                        <div className="text-slate-400 mt-0.5">
                          {m.prodi || "-"}
                        </div>
                      </td>

                      <td className="py-3.5 pr-3 text-slate-700">
                        {m.angkatan || "-"}
                      </td>

                      <td className="py-3.5 pr-3">
                        {m.nama_beasiswa ? (
                          <span className="inline-block bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full text-xs font-medium">
                            {m.nama_beasiswa}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            -
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            handleResetFromTable(m.npm)
                          }
                          disabled={loadingReset}
                          className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium
                                     transition-all duration-200
                                     hover:bg-orange-600 hover:-translate-y-0.5 hover:shadow-md
                                     disabled:opacity-50 disabled:hover:translate-y-0"
                        >
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Reset Password Manual */}
        <div
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
          style={{ animation: "fadeInUp 0.8s ease-out" }}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-orange-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>

            <h2 className="text-lg font-bold text-slate-800">
              Reset Password Mahasiswa
            </h2>
          </div>

          <p className="text-slate-500 text-sm mb-6 mt-1">
            Password mahasiswa akan dikembalikan ke password
            sementara (812800). Bisa juga lewat tombol Reset
            di tabel atas.
          </p>

          <form
            onSubmit={handleResetPassword}
            className="space-y-5"
          >
            <div className="max-w-md">
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                NPM Mahasiswa
              </label>

              <input
                type="text"
                value={npmReset}
                onChange={(e) =>
                  setNpmReset(e.target.value)
                }
                placeholder="Masukkan NPM"
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder:text-slate-400
                           transition-all duration-200
                           focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100
                           hover:border-slate-300"
              />
            </div>

            {errorReset && (
              <div
                className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl"
                style={{ animation: "shake 0.4s ease-in-out" }}
              >
                {errorReset}
              </div>
            )}

            {successReset && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3 rounded-xl">
                {successReset}
              </div>
            )}

            <button
              type="submit"
              disabled={loadingReset}
              className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm
                         shadow-md shadow-orange-200
                         transition-all duration-200
                         hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-300
                         active:translate-y-0
                         disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0
                         inline-flex items-center gap-2"
            >
              {loadingReset ? (
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
                  Mereset...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}