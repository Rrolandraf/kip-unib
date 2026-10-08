"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Berita = {
  id: string;
  judul: string;
  isi: string;
  published: boolean;
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

  function resetForm() {
    setJudul("");
    setIsi("");
    setPublished(false);
    setEditingId(null);
  }

  function handleEdit(item: Berita) {
    setJudul(item.judul);
    setIsi(item.isi);
    setPublished(item.published);
    setEditingId(item.id);

    window.scrollTo({ top: 0, behavior: "smooth" });
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

      const isEdit = editingId !== null;

      const url = isEdit
        ? `/api/admin/berita/${editingId}`
        : "/api/admin/berita";

      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          judul: judul.trim(),
          isi: isi.trim(),
          published,
        }),
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
                disabled={saving}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm
                           shadow-md shadow-blue-200
                           transition-all duration-200
                           hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-300
                           active:translate-y-0
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {saving ? (
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
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
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

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3.5 py-2 rounded-lg text-xs font-medium
                                 transition-all duration-200
                                 hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md"
                    >
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
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
                      {item.published ? (
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
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                          Jadikan Draft
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
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          Publikasikan
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex items-center gap-1.5 bg-red-600 text-white px-3.5 py-2 rounded-lg text-xs font-medium
                                 transition-all duration-200
                                 hover:bg-red-700 hover:-translate-y-0.5 hover:shadow-md"
                    >
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