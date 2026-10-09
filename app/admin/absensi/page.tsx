"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

type Kegiatan = {
  id: string;
  judul: string;
  deadline: string;
  absen_mulai: string | null;
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
    fakultas: string | null;
    prodi: string | null;
    angkatan: number | null;
  } | null;
};

type FilterStatus = "semua" | "pending" | "verified" | "rejected";

export default function AbsensiAdminPage() {
  const [kegiatanList, setKegiatanList] = useState<Kegiatan[]>([]);
  const [absensi, setAbsensi] = useState<Absensi[]>([]);
  const [fotoUrls, setFotoUrls] = useState<Record<string, string>>({});
  const [selectedKegiatanId, setSelectedKegiatanId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("semua");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingVerifSemua, setLoadingVerifSemua] = useState(false);
  const [cari, setCari] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const { data: kegData, error: kegError } = await supabase
        .from("kegiatan")
        .select("id, judul, deadline, absen_mulai, status")
        .order("deadline", { ascending: false });

      if (kegError) {
        console.error("LOAD KEGIATAN ERROR:", kegError);
        setError("Gagal mengambil data kegiatan: " + kegError.message);
        return;
      }
      setKegiatanList(kegData || []);

      const { data: absData, error: absError } = await supabase
        .from("absensi")
        .select(`
          id, kegiatan_id, foto_url, konfirmasi, status, waktu_absen,
          mahasiswa ( nama, npm, fakultas, prodi, angkatan )
        `)
        .order("waktu_absen", { ascending: false });

      if (absError) {
        console.error("LOAD ABSENSI ERROR:", absError);
        setError("Gagal mengambil data absensi: " + absError.message);
        return;
      }

      const list = (absData || []) as unknown as Absensi[];
      setAbsensi(list);

      const paths = list
        .map((a) => a.foto_url)
        .filter((p) => typeof p === "string" && p.length > 0);

      if (paths.length === 0) {
        setFotoUrls({});
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const fotoRes = await fetch("/api/admin/absensi/foto-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ paths }),
      });
      const fotoResult = await fotoRes.json();
      if (fotoRes.ok) setFotoUrls(fotoResult.urls || {});
    } catch (err) {
      console.error("ERROR:", err);
      setError("Terjadi kesalahan saat mengambil data absensi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function verifikasiAbsensi(id: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { alert("Sesi login admin tidak ditemukan."); return; }
      const response = await fetch("/api/admin/absensi/verifikasi", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ attendance_id: id }),
      });
      const result = await response.json();
      if (!response.ok) { alert(result.error || "Gagal memverifikasi."); return; }
      alert("Absensi berhasil diverifikasi.");
      setEditingId(null);
      await loadData();
    } catch (err) { console.error(err); alert("Terjadi kesalahan."); }
  }

  async function tolakAbsensi(id: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { alert("Sesi login admin tidak ditemukan."); return; }
      const response = await fetch("/api/admin/absensi/tolak", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ attendance_id: id }),
      });
      const result = await response.json();
      if (!response.ok) { alert(result.error || "Gagal menolak."); return; }
      alert("Absensi berhasil ditolak.");
      setEditingId(null);
      await loadData();
    } catch (err) { console.error(err); alert("Terjadi kesalahan."); }
  }

  async function verifikasiSemua() {
    if (!selectedKegiatanId || !selectedKegiatan) return;
    const jumlahPending = absensiKegiatanIni.filter((a) => a.status === "pending").length;
    if (jumlahPending === 0) { alert("Tidak ada absensi pending."); return; }
    const konfirmasi = window.confirm(
      `Verifikasi SEMUA (${jumlahPending}) absensi pending untuk kegiatan "${selectedKegiatan.judul}"?`
    );
    if (!konfirmasi) return;
    setLoadingVerifSemua(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { alert("Sesi login tidak ditemukan."); setLoadingVerifSemua(false); return; }
      const response = await fetch("/api/admin/absensi/verifikasi-semua", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ kegiatan_id: selectedKegiatanId }),
      });
      const result = await response.json();
      if (!response.ok) { alert(result.error || "Gagal memverifikasi semua."); setLoadingVerifSemua(false); return; }
      alert(result.message || `${jumlahPending} absensi berhasil diverifikasi.`);
      await loadData();
    } catch (err) { console.error(err); alert("Terjadi kesalahan."); }
    setLoadingVerifSemua(false);
  }

  function downloadExcel() {
    if (!selectedKegiatan || absensiTampil.length === 0) {
      alert("Tidak ada data untuk diunduh.");
      return;
    }
    const dataExcel = absensiTampil.map((item, idx) => ({
      No: idx + 1,
      NPM: item.mahasiswa?.npm || "-",
      Nama: item.mahasiswa?.nama || "-",
      Fakultas: item.mahasiswa?.fakultas || "-",
      "Program Studi": item.mahasiswa?.prodi || "-",
      Angkatan: item.mahasiswa?.angkatan || "-",
      "Waktu Absen": formatTanggal(item.waktu_absen),
      Konfirmasi: item.konfirmasi ? "Ya" : "Tidak",
      Status: statusLabel(item.status),
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataExcel);
    worksheet["!cols"] = [
      { wch: 5 }, { wch: 16 }, { wch: 28 }, { wch: 26 }, { wch: 26 },
      { wch: 10 }, { wch: 22 }, { wch: 12 }, { wch: 20 },
    ];
    const workbook = XLSX.utils.book_new();
    const namaSheet = selectedKegiatan.judul.replace(/[\\/?*[\]:]/g, "").substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, namaSheet || "Absensi");
    const namaFile = `Absensi-${selectedKegiatan.judul.replace(/[^a-zA-Z0-9]/g, "-").substring(0, 40)}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, namaFile);
  }

  function formatTanggal(t: string) {
    return new Date(t).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });
  }
  function formatTanggalSingkat(t: string) {
    return new Date(t).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  }
  function statusLabel(s: string) {
    if (s === "pending") return "Menunggu Verifikasi";
    if (s === "verified") return "Terverifikasi";
    if (s === "rejected") return "Ditolak";
    return s;
  }
  function statusBadge(s: string) {
    if (s === "pending") return "bg-amber-50 text-amber-700 border border-amber-200";
    if (s === "verified") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (s === "rejected") return "bg-red-50 text-red-700 border border-red-200";
    return "bg-slate-100 text-slate-700 border border-slate-200";
  }
  function kegiatanStatusLabel(s: string) {
    if (s === "active") return "Aktif";
    if (s === "closed") return "Ditutup";
    if (s === "draft") return "Draft";
    return s;
  }
  function kegiatanStatusBadge(s: string) {
    if (s === "active") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (s === "closed") return "bg-red-50 text-red-700 border border-red-200";
    return "bg-slate-100 text-slate-700 border border-slate-200";
  }

  const countsByKegiatan = useMemo(() => {
    const map: Record<string, { total: number; pending: number; verified: number; rejected: number }> = {};
    absensi.forEach((a) => {
      if (!map[a.kegiatan_id]) map[a.kegiatan_id] = { total: 0, pending: 0, verified: 0, rejected: 0 };
      map[a.kegiatan_id].total += 1;
      if (a.status === "pending") map[a.kegiatan_id].pending += 1;
      if (a.status === "verified") map[a.kegiatan_id].verified += 1;
      if (a.status === "rejected") map[a.kegiatan_id].rejected += 1;
    });
    return map;
  }, [absensi]);

  const selectedKegiatan = useMemo(
    () => kegiatanList.find((k) => k.id === selectedKegiatanId) || null,
    [kegiatanList, selectedKegiatanId]
  );

  const absensiKegiatanIni = useMemo(() => {
    if (!selectedKegiatanId) return [];
    return absensi.filter((a) => a.kegiatan_id === selectedKegiatanId);
  }, [absensi, selectedKegiatanId]);

  const absensiTampil = useMemo(() => {
    let filtered = absensiKegiatanIni;
    if (filterStatus !== "semua") filtered = filtered.filter((a) => a.status === filterStatus);
    if (cari.trim()) {
      const kw = cari.trim().toLowerCase();
      filtered = filtered.filter(
        (a) => a.mahasiswa?.nama?.toLowerCase().includes(kw) || a.mahasiswa?.npm?.toLowerCase().includes(kw)
      );
    }
    return filtered;
  }, [absensiKegiatanIni, filterStatus, cari]);

  const jumlahPending = useMemo(
    () => absensiKegiatanIni.filter((a) => a.status === "pending").length,
    [absensiKegiatanIni]
  );

  function handleBukaKegiatan(id: string) {
    setSelectedKegiatanId(id);
    setFilterStatus("semua");
    setEditingId(null);
    setCari("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function handleKembaliKeDaftar() {
    setSelectedKegiatanId(null);
    setFilterStatus("semua");
    setEditingId(null);
    setCari("");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between" style={{ animation: "fadeInUp 0.4s ease-out" }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1.5 shadow-sm">
              <img src="/logo-unib.png" alt="Logo UNIB" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">Data Absensi</h1>
              <p className="text-slate-500 mt-0.5 text-sm">Data absensi mahasiswa penerima beasiswa</p>
            </div>
          </div>
          <button
            onClick={() => { window.location.href = "/admin"; }}
            className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300"
          >
            ← Kembali
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
            <p className="font-semibold">Terjadi masalah</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {!selectedKegiatanId && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6" style={{ animation: "fadeInUp 0.5s ease-out" }}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Pilih Kegiatan</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Klik kegiatan untuk melihat daftar absensi mahasiswa.</p>
                </div>
              </div>
              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 disabled:opacity-50"
              >
                {loading ? "Memuat..." : "Refresh"}
              </button>
            </div>

            {loading ? (
              <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500 text-sm">Memuat daftar kegiatan...</div>
            ) : kegiatanList.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500 text-sm">
                Belum ada kegiatan. Tambahkan kegiatan di menu <b>Kelola Kegiatan</b> terlebih dahulu.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                {kegiatanList.map((keg) => {
                  const counts = countsByKegiatan[keg.id] || { total: 0, pending: 0, verified: 0, rejected: 0 };
                  return (
                    <button
                      key={keg.id}
                      onClick={() => handleBukaKegiatan(keg.id)}
                      className="text-left border border-slate-200 rounded-2xl p-5 bg-white transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg hover:border-blue-300 group"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="text-base font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{keg.judul}</h3>
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${kegiatanStatusBadge(keg.status)}`}>
                          {kegiatanStatusLabel(keg.status)}
                        </span>
                      </div>
                      <div className="mb-4 grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Mulai</p>
                          <p className="text-sm text-slate-700 mt-0.5">{keg.absen_mulai ? formatTanggalSingkat(keg.absen_mulai) : "Kapan saja"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Batas Akhir</p>
                          <p className="text-sm text-slate-700 mt-0.5">{formatTanggalSingkat(keg.deadline)}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                        <span className="inline-block bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full text-xs font-medium">
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
                      <div className="mt-4 flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:gap-2 transition-all">
                        Lihat Absensi →
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedKegiatanId && selectedKegiatan && (
          <div className="space-y-6" style={{ animation: "fadeInUp 0.4s ease-out" }}>
            <button
              onClick={handleKembaliKeDaftar}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm transition-all duration-200 hover:-translate-x-0.5"
            >
              ← Kembali ke Daftar Kegiatan
            </button>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedKegiatan.judul}</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedKegiatan.absen_mulai ? `Absen dibuka: ${formatTanggalSingkat(selectedKegiatan.absen_mulai)} · ` : ""}
                    Batas akhir: {formatTanggalSingkat(selectedKegiatan.deadline)}
                  </p>
                </div>
                <span className={`inline-block w-fit px-3 py-1.5 rounded-full text-xs font-medium ${kegiatanStatusBadge(selectedKegiatan.status)}`}>
                  {kegiatanStatusLabel(selectedKegiatan.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
                <div><p className="text-xs font-semibold text-slate-400 uppercase">Total</p><p className="text-lg font-bold text-slate-800 mt-0.5">{absensiKegiatanIni.length}</p></div>
                <div><p className="text-xs font-semibold text-amber-600 uppercase">Menunggu</p><p className="text-lg font-bold text-amber-700 mt-0.5">{absensiKegiatanIni.filter((a) => a.status === "pending").length}</p></div>
                <div><p className="text-xs font-semibold text-emerald-600 uppercase">Terverifikasi</p><p className="text-lg font-bold text-emerald-700 mt-0.5">{absensiKegiatanIni.filter((a) => a.status === "verified").length}</p></div>
                <div><p className="text-xs font-semibold text-red-600 uppercase">Ditolak</p><p className="text-lg font-bold text-red-700 mt-0.5">{absensiKegiatanIni.filter((a) => a.status === "rejected").length}</p></div>
              </div>

              <div className="mt-5 pt-5 border-t border-slate-100 flex flex-wrap gap-3">
                <button
                  onClick={downloadExcel}
                  disabled={absensiTampil.length === 0}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md shadow-emerald-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
                >
                  ⬇ Download Excel ({absensiTampil.length})
                </button>
                <button
                  onClick={verifikasiSemua}
                  disabled={jumlahPending === 0 || loadingVerifSemua}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md shadow-amber-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
                >
                  {loadingVerifSemua ? "Memproses..." : `✓ Verifikasi Semua (${jumlahPending})`}
                </button>
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
                >
                  {loading ? "Memuat..." : "Refresh"}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {(["semua", "pending", "verified", "rejected"] as const).map((k) => {
                  const count =
                    k === "semua" ? absensiKegiatanIni.length :
                    absensiKegiatanIni.filter((a) => a.status === k).length;
                  const label = k === "semua" ? "Semua" : k === "pending" ? "Menunggu" : k === "verified" ? "Terverifikasi" : "Ditolak";
                  return (
                    <button
                      key={k}
                      onClick={() => setFilterStatus(k)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-200 ${
                        filterStatus === k
                          ? "bg-blue-600 text-white border-blue-600 shadow-md"
                          : "bg-white text-slate-700 border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      {label} <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${filterStatus === k ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari nama / NPM..."
                className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm md:w-64 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              {loading ? (
                <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500 text-sm">Memuat data absensi...</div>
              ) : absensiTampil.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500 text-sm">
                  {absensiKegiatanIni.length === 0
                    ? "Belum ada mahasiswa yang absen untuk kegiatan ini."
                    : "Tidak ada absensi yang cocok dengan filter."}
                </div>
              ) : (
                <div className="space-y-5">
                  {absensiTampil.map((item) => {
                    const signedUrl = fotoUrls[item.foto_url];
                    const isEditing = editingId === item.id;
                    const showAksi = item.status === "pending" || isEditing;
                    return (
                      <div key={item.id} className="border border-slate-200 rounded-2xl p-5 hover:border-blue-200 hover:shadow-md transition-all">
                        <div className="flex flex-col lg:flex-row gap-6">
                          <div className="w-full lg:w-56">
                            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Foto Absensi</p>
                            {signedUrl ? (
                              <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                                <img src={signedUrl} alt="Foto absensi" className="w-full h-48 object-cover rounded-xl border border-slate-200 hover:scale-[1.02] transition-transform" />
                              </a>
                            ) : (
                              <div className="h-48 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-sm">
                                {item.foto_url ? "Memuat foto..." : "Tidak ada foto"}
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                              <div>
                                <h3 className="text-lg font-bold text-slate-800">{item.mahasiswa?.nama || "Nama tidak ditemukan"}</h3>
                                <p className="text-slate-500 text-sm font-mono mt-0.5">NPM: {item.mahasiswa?.npm || "-"}</p>
                                {item.mahasiswa?.fakultas && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    {item.mahasiswa.fakultas}
                                    {item.mahasiswa.prodi ? ` · ${item.mahasiswa.prodi}` : ""}
                                    {item.mahasiswa.angkatan ? ` · ${item.mahasiswa.angkatan}` : ""}
                                  </p>
                                )}
                              </div>
                              <span className={`inline-block w-fit px-3 py-1.5 rounded-full text-xs font-medium ${statusBadge(item.status)}`}>
                                {statusLabel(item.status)}
                              </span>
                            </div>
                            <div className="mt-5 grid md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase">Waktu Absensi</p>
                                <p className="font-medium text-slate-800 mt-1 text-sm">{formatTanggal(item.waktu_absen)}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase">Konfirmasi Mahasiswa</p>
                                <p className="font-medium text-slate-800 mt-1 text-sm">{item.konfirmasi ? "Sudah dikonfirmasi" : "Belum dikonfirmasi"}</p>
                              </div>
                            </div>
                            {showAksi ? (
                              <div className="mt-5 flex flex-wrap gap-3">
                                <button
                                  type="button"
                                  onClick={() => verifikasiAbsensi(item.id)}
                                  disabled={item.status === "verified"}
                                  className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  ✓ Verifikasi
                                </button>
                                <button
                                  type="button"
                                  onClick={() => tolakAbsensi(item.id)}
                                  disabled={item.status === "rejected"}
                                  className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-red-700 disabled:opacity-50"
                                >
                                  ✕ Tolak
                                </button>
                                {isEditing && (
                                  <button type="button" onClick={() => setEditingId(null)} className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-xl font-medium text-sm">
                                    Batal
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="mt-5">
                                <button
                                  type="button"
                                  onClick={() => setEditingId(item.id)}
                                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-blue-700"
                                >
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