import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

// ==========================================
// AUTO REDIRECT SAAT SESSION BERAKHIR
// ==========================================
// Kalau Supabase mendeteksi session sudah tidak valid
// (token expired & refresh token gagal), maka otomatis
// redirect user ke halaman login yang sesuai.
//
// Ini mencegah user melihat pesan error membingungkan
// ketika token-nya kadaluarsa setelah tab dibiarkan lama.

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      const path = window.location.pathname;

      // Jangan redirect kalau sudah di halaman login
      // (mencegah loop)
      if (
        path.startsWith("/login") ||
        path.startsWith("/admin/login")
      ) {
        return;
      }

      // Tentukan tujuan redirect berdasarkan path sekarang
      const tujuan = path.startsWith("/admin")
        ? "/admin/login"
        : "/login";

      window.location.href = tujuan;
    }
  });
}