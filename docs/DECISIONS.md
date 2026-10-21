# Keputusan arsitektur (ADR)

Format: konteks, keputusan, konsekuensi. Keputusan baru ditambahkan di bawah dengan nomor berikutnya; keputusan lama tidak dihapus, hanya ditandai "digantikan oleh".

## ADR-001 Stack: React + Vite + TypeScript, PocketBase
Konteks: satu founder, VPS dengan Easypanel, target PWA dan Android, backend minimal di MVP.
Keputusan: apps/web dengan React 18, Vite, TypeScript strict, CSS vanilla dengan token; PocketBase sebagai backend (satu binary, SQLite, auth Google bawaan) di Easypanel; Capacitor untuk Android.
Konsekuensi: sedikit bagian bergerak; PocketBase cukup sampai puluhan ribu pengguna; migrasi ke Postgres bila melewati itu. Tidak memakai Next.js karena tidak butuh SSR.

## ADR-002 Format naskah: Qissa Script, bukan Ink
Konteks: naskah sudah ditulis dalam notasi `Nama:`, `>`, `[Pilihan]`; penulis adalah founder dibantu AI, bukan programmer naratif.
Keputusan: bakukan notasi itu sebagai Qissa Script dengan compiler sendiri (packages/script). Ink tidak dipakai.
Konsekuensi: naskah dari dokumen bisa langsung dikompilasi; fitur bahasa sengaja dibatasi (kondisi hanya variabel boolean). Bila kebutuhan logika tumbuh, pertimbangkan Ink saat itu, bukan sekarang.

## ADR-003 Tanpa login di MVP
Konteks: install dan login memutus viral loop "Lu bakal gimana?"; data pribadi membawa kewajiban UU PDP.
Keputusan: semua fitur inti tanpa akun; progres dan refleksi di perangkat; PocketBase hanya untuk masukan tanpa identitas.
Konsekuensi: progres hilang bila ganti HP (diterima untuk MVP); akun dan sinkronisasi di fase 2 dengan opsi masuk Google.

## ADR-004 Analitik: Umami self-hosted
Konteks: prinsip tanpa pelacak pihak ketiga dan tanpa cookie; VPS tersedia.
Keputusan: Umami di Easypanel; tujuh event tetap tanpa data pribadi.
Konsekuensi: tidak ada funnel per pengguna; cukup untuk metrik agregat yang ditetapkan PRD.

## ADR-005 Konten sebagai data yang dimuat dari server
Konteks: "30 Malam" butuh episode baru tiap hari tanpa rilis app store.
Keputusan: manifest + JSON episode disajikan nginx, di-cache oleh service worker; app shell dan konten berversi terpisah.
Konsekuensi: rilis konten = commit ke content/ dan deploy; app store hanya untuk perubahan shell.

## ADR-006 Tidak ada gamifikasi keimanan
Konteks: leaderboard dan skor amal memicu riya dan membuat orang berhenti jujur saat memilih.
Keputusan: tidak ada poin, skor, leaderboard, atau streak publik; yang dilacak hanya akhir yang sudah dibaca dan jalur.
Konsekuensi: engagement mengandalkan tokoh dan cerita, bukan mekanik; streak privat boleh dipertimbangkan di fase 2.

## ADR-007 Dua pereview berbeda latar, nama tampil
Konteks: kepercayaan adalah moat; krisis kepercayaan pada konten hadis tanpa sumber.
Keputusan: setiap episode direview minimal satu orang berlatar syariah (target dua, NU dan Muhammadiyah), nama dan tanggal tampil di kartu dalil; badge "Belum direview" sampai saat itu.
Konsekuensi: biaya per episode; episode tidak rilis publik tanpa review.

## ADR-008 Rating 17+ dan "berani tapi beradab"
Konteks: tema nyata (judol, pinjol, relasi) dibutuhkan agar cerita terasa sungguhan.
Keputusan: tampilkan tarikan dan harga, bukan mekanisme; linter memblokir kata terlarang; rating 17+ dideklarasikan.
Konsekuensi: segmen di bawah 17 tahun bukan target; kampanye menyebut batas usia.

## ADR-009 CSS vanilla dengan token, tanpa Tailwind
Konteks: UI kecil dan sangat spesifik (chat, kartu), dua tema, prioritas ukuran bundel.
Keputusan: token di `tokens.css`, komponen dengan CSS modul biasa; tidak ada framework CSS.
Konsekuensi: lebih sedikit dependensi; disiplin penamaan diperlukan.
