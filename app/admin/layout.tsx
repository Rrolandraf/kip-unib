"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Halaman login harus bisa diakses tanpa login
  const isLoginPage = pathname === "/admin/login";

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Lewati pengecekan kalau sedang di halaman login
    if (isLoginPage) {
      setChecking(false);
      return;
    }

    let aktif = true;

    async function cekAdmin() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!aktif) return;

        // Belum login
        if (!session) {
          router.replace("/admin/login");
          return;
        }

        // Cek role dari tabel profiles
        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

        if (!aktif) return;

        if (
          profileError ||
          !profile ||
          profile.role !== "admin"
        ) {
          // Bukan admin — paksa logout
          await supabase.auth.signOut();
          router.replace("/admin/login");
          return;
        }

        // Admin valid
        setChecking(false);
      } catch (error) {
        console.error("ADMIN LAYOUT ERROR:", error);

        if (aktif) {
          router.replace("/admin/login");
        }
      }
    }

    cekAdmin();

    return () => {
      aktif = false;
    };
  }, [router, pathname, isLoginPage]);

  // Saat halaman login, langsung tampilkan (jangan tunggu cek)
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Halaman admin lain: tampilkan loader selama cek
  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-100">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="animate-spin w-8 h-8 text-indigo-600"
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
            Memeriksa akses admin...
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}