# Deploy di Easypanel

1. DNS: record `A` untuk `qissah.id`, `staging` dan `umami` ke IP VPS.
2. Easypanel → Create Project `qissa` → Add Service → App.
   - Source: GitHub, repo ini, branch `main` (dan service kedua dari branch `staging` untuk staging.qissah.id).
   - Build: Dockerfile, path `infra/nginx/Dockerfile`, context akar repo. Tahap pertama (Node 22, pnpm) menjalankan `pnpm build`; tahap kedua menyajikan `apps/web/dist` dengan nginx.
   - Environment: variabel `VITE_*` dari DATA-CONTRACTS §1. Easypanel meneruskannya ke build sebagai build arg, dan Dockerfile sudah mendeklarasikan semuanya. Yang wajib hanya `VITE_SITE_URL=https://qissah.id` (staging: `https://staging.qissah.id`); tanpa itu build gagal dengan pesan yang jelas. Tidak ada `.env` yang di-commit. Semua nilai `VITE_*` ikut ke bundel publik, jadi jangan isi rahasia.
   - Domain: `qissah.id`, port 80, HTTPS otomatis.
3. Umami: Templates → Umami → project yang sama, domain `umami.qissah.id`. Login awal `admin`/`umami`, ganti segera. Add website `qissah.id`, salin Website ID.
4. Di Environment service web, isi `VITE_UMAMI_SCRIPT=https://umami.qissah.id/script.js`, `VITE_UMAMI_ID` (Website ID dari langkah 3), dan `VITE_WA_CHANNEL` bila saluran sudah ada, lalu Deploy. Nilai `VITE_*` dibakar ke bundel saat build, jadi perubahan baru berlaku setelah build ulang.
5. PocketBase (saat dibutuhkan): Templates → PocketBase → domain `api.qissah.id`; impor `backend/pocketbase/pb_migrations`.
6. Uji:
   - `curl -I https://qissah.id` menampilkan `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, dan `Cache-Control: no-cache`.
   - `https://qissah.id/healthz` menjawab `ok`; pasang pemantau uptime ke alamat ini (RUNBOOK).
   - Buka qissah.id di HP, mainkan satu episode, lalu cek Umami → Events. Episode baru tampil mulai tanggal `rilis`-nya (zona Asia/Jakarta).

Uji lokal sebelum push (butuh Docker):

```sh
docker build -f infra/nginx/Dockerfile --build-arg VITE_SITE_URL=https://qissah.id -t qissa-web .
docker run --rm -p 8788:80 qissa-web
curl -I http://localhost:8788/
```

Rollback: Easypanel menyimpan image sebelumnya; manifest konten bisa diubah tanpa build ulang bila disajikan dari volume (fase berikutnya).
