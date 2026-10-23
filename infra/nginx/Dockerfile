# Dibangun dari akar repo: docker build -f infra/nginx/Dockerfile --build-arg VITE_SITE_URL=https://qissah.id .
# Tahap 1 membangun apps/web (qs compile lalu vite build); tahap 2 menyajikan apps/web/dist dengan nginx.

FROM node:22-alpine AS build
WORKDIR /repo
# Versi sama dengan `packageManager` di package.json.
RUN npm install -g pnpm@11.17.0
# Manifest dependensi lebih dulu supaya lapisan install tetap di-cache selama lockfile tidak berubah.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
# Ikut lockfile workspace; proyek native di apps/android/android tidak masuk konteks (.dockerignore).
COPY apps/android/package.json apps/android/
COPY packages/engine/package.json packages/engine/
COPY packages/script/package.json packages/script/
RUN pnpm install --frozen-lockfile
COPY . .
# Konfigurasi web (DATA-CONTRACTS §1) masuk sebagai build arg. Easypanel meneruskan variabel Environment
# service sebagai build arg; tidak ada .env yang di-commit. Build gagal dengan pesan jelas bila yang wajib kosong.
ARG VITE_SITE_URL
ARG VITE_CONTENT_BASE=/content
ARG VITE_UMAMI_SCRIPT
ARG VITE_UMAMI_ID
ARG VITE_WA_CHANNEL
ARG VITE_PB_URL
ARG VITE_APP_VERSION
RUN pnpm build

FROM nginx:1.30-alpine
COPY infra/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist/ /usr/share/nginx/html/
EXPOSE 80
