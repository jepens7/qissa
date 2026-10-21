# Dibangun dari akar repo: docker build -f infra/nginx/Dockerfile .
# Tahap MVP sementara: menyajikan infra/prototype sampai apps/web/dist tersedia.
# Setelah apps/web dibangun, ganti baris COPY terakhir menjadi: COPY apps/web/dist/ /usr/share/nginx/html/
FROM nginx:1.27-alpine
COPY infra/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY infra/prototype/ /usr/share/nginx/html/
EXPOSE 80
