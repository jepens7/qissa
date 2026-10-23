# Deploy di Easypanel

1. DNS: record `A` untuk `qissah.id`, `staging` dan `umami` ke IP VPS.
2. Easypanel → Create Project `qissa` → Add Service → App.
   - Source: GitHub, repo ini, branch `main` (dan service kedua dari branch `staging` untuk staging.qissah.id).
   - Build: Dockerfile, path `infra/nginx/Dockerfile`, context akar repo. Tahap pertama (Node 22, pnpm) menjalankan `pnpm build`; tahap kedua menyajikan `apps/web/dist` dengan nginx.
   - Environment: variabel `VITE_*` dari DATA-CONTRACTS §1. Easypanel meneruskannya ke build sebagai build arg, dan Dockerfile sudah mendeklarasikan semuanya. Yang wajib hanya `VITE_SITE_URL=https://qissah.id` (staging: `https://staging.qissah.id`); tanpa itu build gagal dengan pesan yang jelas. Tidak ada `.env` yang di-commit. Semua nilai `VITE_*` ikut ke bundel publik, jadi jangan isi rahasia.
   - Domain: `qissah.id`, port 80, HTTPS otomatis.
3. Umami: Templates → Umami → project yang sama, domain `umami.qissah.id`. Login awal `admin`/`umami`, ganti segera. Add website `qissah.id`, salin Website ID.
4. Di Environment service web, isi `VITE_UMAMI_SCRIPT=https://umami.qissah.id/script.js`, `VITE_UMAMI_ID` (Website ID dari langkah 3), dan `VITE_WA_CHANNEL` bila saluran sudah ada, lalu Deploy. Nilai `VITE_*` dibakar ke bundel saat build, jadi perubahan baru berlaku setelah build ulang.
5. PocketBase (setelah Ramadan, bila form masukan dibangun): Templates → PocketBase → domain `api.qissah.id`; impor `backend/pocketbase/pb_migrations`.
6. Uji:
   - `curl -I https://qissah.id` menampilkan `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, dan `Cache-Control: no-cache`.
   - `https://qissah.id/healthz` menjawab `ok`; pasang pemantau uptime ke alamat ini (RUNBOOK).
   - Sesi uji analitik (BACKLOG E3), di HP pada atau setelah tanggal `rilis` (zona Asia/Jakarta; sebelum itu daftar episode kosong). Tujuh event SRS §8 muncul dari urutan ini:
     1. Buka qissah.id, lalu tekan salah satu opsi poll: `poll`, lalu `mulai` saat Episode 1 terbuka.
     2. Pilih di Pilihan 1 dan Pilihan 2: `pilihan` dua kali, lalu `selesai` di akhir.
     3. Di layar akhir, tekan "Bagikan dilemanya" (`bagikan`) dan "Kirim masukan ke pembuat" (`masukan`); lembar bagikan boleh ditutup.
     4. Tekan "Ikuti saluran" (`saluran`); kartu ini hanya ada bila `VITE_WA_CHANNEL` terisi.
     5. Umami → Websites → qissah.id → Events: tujuh nama event terlihat. Screenshot dasbornya untuk PR E3.

Uji lokal sebelum push (butuh Docker):

```sh
docker build -f infra/nginx/Dockerfile --build-arg VITE_SITE_URL=https://qissah.id -t qissa-web .
docker run --rm -p 8788:80 qissa-web
curl -I http://localhost:8788/
```

Rollback: Easypanel menyimpan image sebelumnya; manifest konten bisa diubah tanpa build ulang bila disajikan dari volume (fase berikutnya).
