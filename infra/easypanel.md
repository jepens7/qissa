# Deploy di Easypanel

1. DNS: record `A` untuk `qissah.id`, `staging` dan `umami` ke IP VPS.
2. Easypanel → Create Project `qissa` → Add Service → App.
   - Source: GitHub, repo ini, branch `main` (dan service kedua dari branch `staging` untuk staging.qissah.id).
   - Build: Dockerfile, path `infra/nginx/Dockerfile`, context akar repo.
   - Domain: `qissah.id`, port 80, HTTPS otomatis.
3. Umami: Templates → Umami → project yang sama, domain `umami.qissah.id`. Login awal `admin`/`umami`, ganti segera. Add website `qissah.id`, salin Website ID.
4. Isi konfigurasi aplikasi (prototipe: blok `CONFIG` di `infra/prototype/index.html`; apps/web: `.env` `VITE_UMAMI_SCRIPT`, `VITE_UMAMI_ID`, `VITE_WA_CHANNEL`, `VITE_SITE_URL`). Push; Easypanel membangun ulang.
5. PocketBase (saat dibutuhkan): Templates → PocketBase → domain `api.qissah.id`; impor `backend/pocketbase/pb_migrations`.
6. Uji: buka qissah.id di HP, mainkan satu episode, cek Umami → Events.

Rollback: Easypanel menyimpan image sebelumnya; manifest konten bisa diubah tanpa build ulang bila disajikan dari volume (fase berikutnya).
