# Checklist rilis — Qissa

## Web (setiap rilis app shell)
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm qs lint` hijau.
- [ ] Versi di `apps/web/package.json` dinaikkan; tag `web-vX.Y.Z`.
- [ ] Lighthouse mobile di staging: Performance ≥ 85, Accessibility ≥ 95, PWA installable.
- [ ] Uji di dua HP Android nyata (satu kelas menengah bawah): landing, satu episode tamat, refleksi, bagikan, offline (mode pesawat lalu buka episode yang pernah dibaca).
- [ ] Pembaruan service worker terdeteksi dan baris "Versi baru tersedia" muncul.
- [ ] Merge ke `main`; cek produksi di HP.

## Android (Play Store)
Sekali:
- [ ] Akun Play Console (pribadi: wajib closed testing 12 penguji selama 14 hari sebelum produksi).
- [ ] Play App Signing diaktifkan; keystore unggah dicadangkan terenkripsi di dua tempat.
- [ ] Listing: nama "Qissa", deskripsi singkat dan panjang (Indonesia), ikon 512, feature graphic 1024×500, minimal 4 screenshot HP (360×780 dari dua tema), kategori Buku dan Referensi atau Gaya Hidup.
- [ ] Kuesioner rating konten diisi jujur (referensi perjudian dan tema dewasa tanpa adegan eksplisit).
- [ ] Data Safety: analitik tanpa identitas; kebijakan privasi `https://qissah.id/privasi`.
- [ ] Pendaftaran PSE Lingkup Privat selesai atau sedang berjalan dengan bukti.
Setiap rilis:
- [ ] `versionCode` naik, `versionName` = versi web.
- [ ] `pnpm cap:sync` (build web mode `android`, lalu `cap sync`); build AAB di Android Studio dengan keystore yang benar.
- [ ] Internal testing → closed testing → production dengan rollout bertahap 20% lalu 100%.
- [ ] Deep link `https://qissah.id/#ep02` membuka app ke episode itu.
- [ ] Catatan rilis satu paragraf berbahasa Indonesia.

## Konten (setiap episode)
- [ ] Checklist QA di `docs/CONTENT-RULES.md` §6 terpenuhi.
- [ ] `dalil.md`: `status: reviewed`, `reviewed_by`, `reviewed_at`.
- [ ] Entri manifest dengan `rilis` dan `versi_konten` dari `qs compile`.
- [ ] Dibaca tuntas di staging di HP.
- [ ] Pesan saluran WA disiapkan.
