"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Berita = {
  id: string;
  judul: string;
  isi: string;
  published: boolean;
  lampiran_url: string | null;
  lampiran_tipe: string | null;
  lampiran_nama: string | null;
  created_at: string;
  updated_at: string;
};

export default function AdminBeritaPage() {
  const router = useRouter();

  const [berita, setBerita] = useState<Berita[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [published, setPublished] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Lampiran
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    null
  );
  const [previewTipe, setPreviewTipe] = useState<
    "gambar" | "pdf" | null
  >(null);
  const [existingLampiranUrl, setExistingLampiranUrl] = useState<
    string | null
  >(null);
  const [existingLampiranTipe, setExistingLampiranTipe] = useState<
    string | null
  >(null);
  const [existingLampiranNama, setExistingLampiranNama] = useState<
    string | null
  >(null);
  const [hapusLampiran, setHapusLampiran] = useState(false);
  const [uploadingLampiran, setUploadingLampiran] =
    useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || null;
  }

  async function loadBerita() {
    setLoading(true);
    setError("");

    try {
      const token = await getToken();

      if (!token) {
        router.push("/admin/login");
        return;
      }

      const res = await fetch("/api/admin/berita", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Gagal memuat berita.");
        return;
      }

      setBerita(result.berita || []);
    } catch (error) {
      console.error(error);
      setError("Terjadi kesalahan saat memuat berita.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBerita();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preview file yang baru dipilih
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setPreviewTipe(null);
      return;
    }

    const tipe = file.type.startsWith("image/")
      ? "gambar"
      : file.type === "application/pdf"
      ? "pdf"
      : null;

    setPreviewTipe(tipe);

    if (tipe === "gambar") {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  function resetForm() {
    setJudul("");
    setIsi("");
    setPublished(false);
    setEditingId(null);
    setFile(null);
    setPreviewUrl(null);
    setPreviewTipe(null);
    setExistingLampiranUrl(null);
    setExistingLampiranTipe(null);
    setExistingLampiranNama(null);
    setHapusLampiran(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleEdit(item: Berita) {
    setJudul(item.judul);
    setIsi(item.isi);
    setPublished(item.published);
    setEditingId(item.id);
    setFile(null);
    setPreviewUrl(null);
    setPreviewTipe(null);
    setExistingLampiranUrl(item.lampiran_url);
    setExistingLampiranTipe(item.lampiran_tipe);
    setExistingLampiranNama(item.lampiran_nama);
    setHapusLampiran(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handlePilihFile(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const f = e.target.files?.[0] || null;

    if (!f) return;

    // Validasi tipe
    const ok =
      f.type.startsWith("image/") ||
      f.type === "application/pdf";

    if (!ok) {
      alert("File harus berupa gambar (JPG/PNG) atau PDF.");
      e.target.value = "";
      return;
    }

    // Validasi ukuran
    const MaksGambar = 4 * 1024 * 1024;
    const MaksPdf = 8 * 1024 * 1024;
    const maks = f.type === "application/pdf" ? MaksPdf : MaksGambar;

    if (f.size > maks) {
      alert(
        f.type === "application/pdf"
          ? "Ukuran PDF maksimal 8 MB."
          : "Ukuran gambar maksimal 4 MB."
      );
      e.target.value = "";
      return;
    }

    setFile(f);
    setHapusLampiran(false);
  }

  function hapusFileBaru() {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function tandaiHapusLampiranLama() {
    setHapusLampiran(true);
  }

  function batalkanHapusLampiranLama() {
    setHapusLampiran(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    if (!judul.trim()) {
      setError("Judul wajib diisi.");
      return;
    }

    if (!isi.trim()) {
      setError("Isi wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const token = await getToken();

      if (!token) {
        router.push("/admin/login");
        return;
      }

      // ==========================================
      // 1. UPLOAD FILE BARU (JIKA ADA)
      // ==========================================
      let lampiranUrl = existingLampiranUrl;
      let lampiranTipe = existingLampiranTipe;
      let lampiranNama = existingLampiranNama;

      if (file) {
        setUploadingLampiran(true);

        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch(
          "/api/admin/berita/upload",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        const uploadResult = await uploadRes.json();

        if (!uploadRes.ok) {
          setError(
            uploadResult.error || "Gagal mengupload lampiran."
          );
          setSaving(false);
          setUploadingLampiran(false);
          return;
        }

        lampiranUrl = uploadResult.lampiran_url;
        lampiranTipe = uploadResult.lampiran_tipe;
        lampiranNama = uploadResult.lampiran_nama;
        setUploadingLampiran(false);
      }

      // Kalau user tandai hapus lampiran lama
      if (hapusLampiran && !file) {
        lampiranUrl = null;
        lampiranTipe = null;
        lampiranNama = null;
      }

      // ==========================================
      // 2. SIMPAN BERITA
      // ==========================================
      const isEdit = editingId !== null;

      const url = isEdit
        ? `/api/admin/berita/${editingId}`
        : "/api/admin/berita";

      const method = isEdit ? "PUT" : "POST";

      const body: Record<string, unknown> = {
        judul: judul.trim(),
        isi: isi.trim(),
        published,
        lampiran_url: lampiranUrl,
        lampiran_tipe: lampiranTipe,
        lampiran_nama: lampiranNama,
      };

      // Kalau edit dan sebelumnya ada lampiran lama,
      // dan user ganti / hapus → minta API hapus file lama
      if (isEdit && existingLampiranUrl) {
        const lampiranBerubah =
          file !== null ||
          (hapusLampiran && !file) ||
          lampiranUrl !== existingLampiranUrl;

        if (lampiranBerubah) {
          body.hapus_lampiran_lama = true;
          body.lampiran_lama_url = existingLampiranUrl;
        }
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Gagal menyimpan berita.");
        return;
      }

      resetForm();
      await loadBerita();
    } catch (error) {
      console.error(error);
      setError("Terjadi kesalahan saat menyimpan berita.");
    } finally {
      setSaving(false);
      setUploadingLampiran(false);
    }
  }

  async function handleDelete(id: string) {
    const konfirmasi = window.confirm(
      "Yakin ingin menghapus berita ini? Tindakan ini tidak dapat dibatalkan."
    );

    if (!konfirmasi) return;

    try {
      const token = await getToken();

      if (!token) {
        router.push("/admin/login");
        return;
      }

      const res = await fetch(`/api/admin/berita/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.error || "Gagal menghapus berita.");
        return;
      }

      if (editingId === id) {
        resetForm();
      }

      await loadBerita();
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat menghapus berita.");
    }
  }

  async function handleTogglePublish(item: Berita) {
    try {
      const token = await getToken();

      if (!token) {
        router.push("/admin/login");
        return;
      }

      const res = await fetch(`/api/admin/berita/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          published: !item.published,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(result.error || "Gagal mengubah status publish.");
        return;
      }

      await loadBerita();
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan.");
    }
  }

  function formatTanggal(tanggal: string) {
    return new Date(tanggal).toLocaleString("id-ID", {
      dateStyle: "long",
      timeStyle: "short",
    });
  }

  function formatNamaFile(nama: string | null) {
    if (!nama) return "";
    if (nama.length > 40) {
      return nama.substring(0, 37) + "...";
    }
    return nama;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 p-6">
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
                Berita & Pengumuman
              </h1>

              <p className="text-slate-500 mt-0.5 text-sm">
                Kelola berita dan pengumuman untuk mahasiswa.
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

        {/* ERROR GLOBAL */}
        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm"
            style={{ animation: "shake 0.4s ease-in-out" }}
          >
            {error}
          </div>
        )}

        {/* FORM */}
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>

            <h2 className="text-lg font-bold text-slate-800">
              {editingId ? "Edit Berita" : "Tambah Berita"}
            </h2>
          </div>

          <p className="text-slate-500 text-sm mb-6 mt-1">
            {editingId
              ? "Ubah berita yang sudah ada."
              : "Buat berita atau pengumuman baru."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                Judul
              </label>

              <input
                type="text"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Masukkan judul berita"
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder:text-slate-400
                           transition-all duration-200
                           focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                           hover:border-slate-300"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                Isi Berita
              </label>

              <textarea
                value={isi}
                onChange={(e) => setIsi(e.target.value)}
                placeholder="Tulis isi berita atau pengumuman di sini..."
                rows={6}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder:text-slate-400
                           transition-all duration-200
                           focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100
                           hover:border-slate-300"
              />
            </div>

            {/* LAMPIRAN */}
            <div>
              <label className="block mb-2 text-sm font-semibold text-slate-700">
                Lampiran{" "}
                <span className="text-slate-400 font-normal">
                  (opsional · gambar atau PDF)
                </span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={handlePilihFile}
                className="hidden"
              />

              {/* Kalau ada file baru dipilih */}
              {file ? (
                <div className="border-2 border-blue-300 bg-blue-50/40 rounded-xl p-4">
                  {previewTipe === "gambar" && previewUrl ? (
                    <div className="relative rounded-lg overflow-hidden mb-3">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full max-h-64 object-contain bg-white"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-5 h-5 text-red-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          PDF ·{" "}
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="inline-flex items-center gap-1.5 bg-white text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium
                                 transition-all duration-200 hover:shadow-md hover:border-slate-300"
                    >
                      Ganti File
                    </button>

                    <button
                      type="button"
                      onClick={hapusFileBaru}
                      className="inline-flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium
                                 transition-all duration-200 hover:bg-red-700"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ) : existingLampiranUrl && !hapusLampiran ? (
                /* Lampiran lama (dari berita yang sedang diedit) */
                <div className="border border-slate-200 bg-slate-50 rounded-xl p-4">
                  {existingLampiranTipe === "gambar" ? (
                    <div className="rounded-lg overflow-hidden mb-3 bg-white border border-slate-200">
                      <img
                        src={existingLampiranUrl}
                        alt="Lampiran lama"
                        className="w-full max-h-64 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-5 h-5 text-red-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {existingLampiranNama || "lampiran.pdf"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Lampiran saat ini
                        </p>
                      </div>
                      <a
                        href={existingLampiranUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 underline"
                      >
                        Lihat
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="inline-flex items-center gap-1.5 bg-white text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium
                                 transition-all duration-200 hover:shadow-md hover:border-slate-300"
                    >
                      Ganti Lampiran
                    </button>

                    <button
                      type="button"
                      onClick={tandaiHapusLampiranLama}
                      className="inline-flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium
                                 transition-all duration-200 hover:bg-red-700"
                    >
                      Hapus Lampiran
                    </button>
                  </div>
                </div>
              ) : hapusLampiran && !file ? (
                /* Konfirmasi hapus lampiran lama */
                <div className="border-2 border-dashed border-red-300 bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-red-700 font-medium">
                    Lampiran akan dihapus saat disimpan.
                  </p>

                  <div className="mt-3 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={batalkanHapusLampiranLama}
                      className="bg-white text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:shadow-md"
                    >
                      Batal
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700"
                    >
                      Pilih File Baru
                    </button>
                  </div>
                </div>
              ) : (
                /* Belum ada file */
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 rounded-xl p-6 text-center
                             transition-all duration-200
                             hover:border-blue-400 hover:bg-blue-50/40
                             group"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
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
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                  </div>

                  <p className="text-sm font-medium text-slate-700">
                    Klik untuk pilih file lampiran
                  </p>

                  <p className="text-xs text-slate-400 mt-1">
                    Gambar (JPG/PNG, maks 4 MB) · PDF (maks 8 MB)
                  </p>
                </button>
              )}
            </div>

            {/* Toggle publish */}
            <label
              htmlFor="published"
              className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 cursor-pointer
                         transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/40"
            >
              <input
                id="published"
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />

              <span className="text-sm text-slate-700">
                Publikasikan (langsung tampil di dashboard
                mahasiswa)
              </span>
            </label>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving || uploadingLampiran}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm
                           shadow-md shadow-blue-200
                           transition-all duration-200
                           hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-300
                           active:translate-y-0
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {uploadingLampiran ? (
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
                    Mengupload Lampiran...
                  </>
                ) : saving ? (
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
                ) : editingId ? (
                  "Simpan Perubahan"
                ) : (
                  "Tambah Berita"
                )}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-white text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl font-medium text-sm
                             transition-all duration-200
                             hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300"
                >
                  Batal Edit
                </button>
              )}
            </div>
          </form>
        </div>

        {/* DAFTAR BERITA */}
        <div
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
          style={{ animation: "fadeInUp 0.6s ease-out" }}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
            </div>

            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800">
                Daftar Berita
              </h2>

              <p className="text-slate-500 text-sm mt-0.5">
                Semua berita, termasuk yang belum
                dipublikasikan.
              </p>
            </div>

            <button
              onClick={loadBerita}
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
            <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500 text-sm mt-4">
              Memuat berita...
            </div>
          ) : berita.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-8 text-center text-slate-500 text-sm mt-4">
              Belum ada berita.
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {berita.map((item) => (
                <div
                  key={item.id}
                  className="border border-slate-200 rounded-xl p-5
                             transition-all duration-300
                             hover:border-amber-200 hover:shadow-md"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-slate-800">
                        {item.judul}
                      </h3>

                      <p className="text-xs text-slate-400 mt-1">
                        Dibuat: {formatTanggal(item.created_at)}
                      </p>
                    </div>

                    <span
                      className={`inline-block w-fit px-3 py-1.5 rounded-full text-xs font-medium ${
                        item.published
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {item.published
                        ? "Dipublikasikan"
                        : "Draft"}
                    </span>
                  </div>

                  <p className="text-sm text-slate-700 mt-3 whitespace-pre-line leading-relaxed">
                    {item.isi}
                  </p>

                  {/* Lampiran */}
                  {item.lampiran_url && item.lampiran_tipe && (
                    <div className="mt-4">
                      {item.lampiran_tipe === "gambar" ? (
                        <a
                          href={item.lampiran_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block group"
                        >
                          <img
                            src={item.lampiran_url}
                            alt={item.lampiran_nama || "Lampiran"}
                            className="max-h-48 rounded-lg border border-slate-200 group-hover:shadow-md transition-all"
                          />
                        </a>
                      ) : (
                        <a
                          href={item.lampiran_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-lg text-xs font-medium
                                     transition-all duration-200 hover:bg-red-100"
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
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                          {formatNamaFile(item.lampiran_nama) ||
                            "Lihat PDF"}
                        </a>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3.5 py-2 rounded-lg text-xs font-medium
                                 transition-all duration-200
                                 hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePublish(item)}
                      className={`inline-flex items-center gap-1.5 text-white px-3.5 py-2 rounded-lg text-xs font-medium
                                 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
                                 ${
                                   item.published
                                     ? "bg-amber-600 hover:bg-amber-700"
                                     : "bg-emerald-600 hover:bg-emerald-700"
                                 }`}
                    >
                      {item.published
                        ? "Jadikan Draft"
                        : "Publikasikan"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex items-center gap-1.5 bg-red-600 text-white px-3.5 py-2 rounded-lg text-xs font-medium
                                 transition-all duration-200
                                 hover:bg-red-700 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      Hapus
                    </button>
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