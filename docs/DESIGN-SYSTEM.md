# Design system — Qissa

Token dan komponen yang sudah terbukti di prototipe (`infra/prototype/index.html`), dibakukan supaya versi React tidak melenceng. Konsep visual: halaman ini adalah layar HP di malam hari; satu-satunya objek yang "didesain" adalah kartu dalil, yang tampil sebagai kertas hangat.

## 1. Token warna

| Token | Terang | Gelap | Dipakai untuk |
| --- | --- | --- | --- |
| `--bg` | #E3E8EC | #090D11 | Latar halaman di layar lebar |
| `--screen` | #F2F4F6 | #10161C | Latar area chat |
| `--surface` | #FFFFFF | #1A222B | Gelembung masuk, kartu |
| `--surface-2` | #E8EDF3 | #232E39 | Pil sistem, placeholder |
| `--ink` | #141A1F | #E8EDF1 | Teks utama |
| `--ink-2` | #4A545D | #B9C2CB | Teks narasi, teks sekunder |
| `--muted` | #5F686F | #8E9AA5 | Label, status, catatan, batas kolom isian |
| `--line` | rgba(20,26,31,.11) | rgba(232,237,241,.11) | Garis dan border |
| `--accent` | #2B4DD6 | #8DA3FF | Tombol utama, fokus |
| `--accent-ink` | #1E3BAE | #B4C2FF | Nama pengirim di grup, tautan |
| `--on-accent` | #FFFFFF | #0B0F13 | Teks di atas accent |
| `--out` | #DCE4FB | #223466 | Gelembung keluar, avatar |
| `--out-ink` | #152657 | #DCE4FB | Teks gelembung keluar |
| `--paper` | #FBF7EE | #2B2622 | Kartu dalil |
| `--paper-ink` | #2A2420 | #EFE7D8 | Teks kartu dalil |
| `--paper-muted` | #7A6E60 | #B5A991 | Rujukan di kartu dalil |
| `--paper-rule` | #DCD2C0 | #4C4238 | Garis di kartu dalil |
| `--bank` | #0E3B2E | #163F33 | Kartu m-banking |
| `--bank-ink` | #E9F5EF | #E9F5EF | Teks kartu m-banking |

Aturan: komponen hanya memakai token; tidak ada warna literal di komponen. Setiap pasangan teks/latar diuji kontras ≥ 4.5:1 (teks kecil) atau 3:1 (teks ≥ 18 px tebal). Mode gelap mengikuti sistem; `data-theme` disiapkan untuk pilihan manual nanti.

Hasil uji kontras (23 Oktober, F1), rasio terendah tiap token teks terhadap latar tempat ia dipakai:
- Terang: `--ink` 14,22; `--ink-2` 6,26; `--muted` 4,60 (di `--bg`); `--accent-ink` 7,43 (tautan footer di `--bg`); `--out-ink` 11,43 (label lampiran dengan opacity 0,75: 5,72); `--on-accent` 6,70; `--paper-ink` 14,32; `--paper-muted` 4,65; `--bank-ink` 11,15 (label kecil dengan opacity 0,75: 6,99). `--muted` terang digelapkan dari #78848D (prototipe, 3,10–3,83:1) menjadi #5F686F.
- Gelap: `--muted` 4,81 (di `--surface-2`); token lain ≥ 6,45; teks dengan opacity 0,75: label lampiran gelembung keluar 6,06 dan label kecil kartu bank 6,65.
- Batas kolom isian (textarea) memakai `--muted` (≥ 4,60:1, syarat WCAG 1.4.11 adalah 3:1). `--line` (1,25:1) hanya untuk garis dekoratif.

## 2. Tipografi

| Peran | Font | Ukuran / tinggi baris | Bobot |
| --- | --- | --- | --- |
| UI dan chat | Plus Jakarta Sans, fallback system-ui | 15.5 / 1.4 (gelembung), 13 (label), 12.5 (status) | 400, 500, 600, 700 |
| Narasi | Newsreader, fallback Georgia | 17.5 / 1.6 | 400 |
| Judul sampul dan home | Newsreader | 30 / 1.12 (sampul), 34 / 1.1 (home), 24 (kartu episode) | 500 |
| Kartu dalil | Newsreader | 16.5 / 1.6; judul 22 / 1.25 | 400, 500 |
| Arab | Amiri, fallback Scheherazade New, Noto Naskh Arabic | 25 / 1.95, RTL, rata kanan | 400 |
| Nominal m-banking | Plus Jakarta Sans | 24 / 1.1 | 600 |

Tanda baca tipografis (“ ” ’) di semua teks. Huruf kapital hanya di awal kalimat dan nama; tidak ada teks kapital semua kecuali yang disengaja dalam cerita (komentar PENIPU, NGINEP).

## 3. Ruang, bentuk, gerak

- Satuan spasi 4 px: 4, 8, 12, 14, 16, 18, 24.
- Radius: gelembung 18 (sudut ekor 6), kartu 16, kartu sampul 18, tombol 12–14, pil 999, kartu kecil di dalam gelembung 12.
- Lebar kolom maksimum 440 px; gutter 12 px; gelembung maksimum 82% lebar.
- Gerak: hanya titik "mengetik…" (blink 1.2 s) dan gulir halus; keduanya dimatikan oleh `prefers-reduced-motion`. Tidak ada animasi masuk untuk gelembung.
- Bayangan: tidak ada. Pemisahan lewat warna permukaan dan garis.

## 4. Inventaris komponen

| Komponen | Props utama | Status | Catatan |
| --- | --- | --- | --- |
| `Header` | name, initial, status, right | status "mengetik…" | Sticky; `top: env(safe-area-inset-top)` |
| `Cover` | kicker, title, body, memo?, length | | Teks memo memakai Newsreader |
| `EpisodeCard` (home) | num, title, teaser, status | fokus | Tombol penuh, teks rata kiri |
| `PollCard` (home) | question, options | | Tombol `Choice` tiga buah |
| `Bubble` | side (in/out), text, from?, attach? | | Nama pengirim hanya di grup |
| `TypingDots` | | | Gelembung masuk sementara |
| `NarrationCard` | text | | Tanpa border; serif |
| `Pill` | text | | Sistem dan label view |
| `ShotCard` | state (closed/chat/comment), data | | Di dalam gelembung masuk |
| `NotifCard` | app, text, time | | Ikon kotak dua huruf |
| `BankCard` | amount, from | | Permukaan `--bank` |
| `ChoiceBlock` | label, options, picked?, disabled | picked, disabled, fokus | Tidak ada tanda benar/salah |
| `TapHint` | text | hidden | Tombol tak terlihat untuk keyboard |
| `EndCard` | path, endings, pollNote? | | |
| `PaperCard` (dalil) | sections, review | draft/reviewed | Badge status review |
| `ReflectionCard` | question, value, onSave | saved/failed | Textarea; pesan di bawah |
| `ShareCard` | onShare, onFeedback, note | | |
| `ChannelCard` | url | | Hanya bila URL dikonfigurasi |
| `NextCard` | next?, onRestartP2, onRestart, onHome | | |
| `UpdateBar` | | tampil saat service worker baru menunggu | Satu baris di atas Header: "Versi baru tersedia." dan tombol "Muat ulang"; tidak memaksa (SRS PWA-3) |

## 5. Microcopy
- Nada tombol: kata kerja, kalimat biasa: "Ketuk untuk lanjut", "Simpan di HP ini", "Bagikan dilemanya", "Ikuti saluran", "Ulang dari Pilihan 2".
- Tidak ada tanda seru, tidak ada "Selamat!", tidak ada "Hebat!". Tamat diumumkan datar: "Episode 1 selesai".
- Pesan kegagalan menjelaskan apa yang bisa dilakukan: "Tidak bisa menyimpan di browser ini. Salin teksnya kalau ingin disimpan."
- Semua string ada di `i18n/id.json`; kunci bernama menurut tempat, bukan isi (`reader.hint.next`).

## 6. Aksesibilitas
- Semua tombol asli `<button>`; fokus terlihat dengan outline 2 px `--accent`.
- Area cerita bisa dimajukan dengan Space, Enter, panah kanan; textarea dan tombol tidak mencuri pintasan itu.
- `aria-live="polite"` pada log cerita; satu baris baru per ketukan sehingga pembaca layar tidak kebanjiran.
- Teks Arab diberi `lang="ar"` dan `dir="rtl"`.
- Ukuran sentuh minimal 44 px tinggi untuk tombol pilihan.
