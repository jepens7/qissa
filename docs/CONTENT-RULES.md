# Aturan konten Qissa (ringkasan story bible untuk produksi dan linter)

Sumber lengkap: story bible (Claude Doc). Dokumen ini memuat bagian yang mengikat kode, linter, dan review.

## 1. Prinsip
1. Tidak ada pilihan yang jelas benar. Setiap dilema mempertemukan dua nilai yang sama-sama sah.
2. Dalil setelah pilihan; kartu dalil menjelaskan prinsip, tidak menghakimi tokoh.
3. Tidak ada skor iman.

Tes: pembaca merasakan sesuatu sebelum diberi tahu sesuatu.

## 2. Tokoh tetap Season 1
Raka (23, POV), Nadia (24), Dimas (23), Fajar (34), Sarah (31), Ibu/Bu Yanti (58). Pendukung: Bram, Pak Hendra, Bu Sinta, Gilang, Tika, Dion, Bu Kos. Suara chat tiap tokoh ada di bible; jangan mengubah registernya tanpa alasan cerita.

## 3. Bahasa
- Antarteman: gue/lu. Dalam keluarga: aku/kamu, "Mas", "Dek", "Bu".
- Pergantian register adalah alat cerita (Raka memanggil Fajar "lu" hanya saat marah).
- Slang diverifikasi pembaca Gen Z; kata yang dinilai "ketuaan" masuk daftar peringatan linter.
- Istilah Arab seperlunya dan konsisten dengan tokoh (Nadia memakai "afwan", Raka tidak).
- Tipografi: “ ” dan ’ di teks; tanda kutip lurus hanya di kode.

## 4. Ritme dan struktur
- Satu gelembung maksimal dua baris di layar HP (peringatan linter: 160 karakter).
- "Mengetik…" maksimal dua kali per jalur.
- Kartu narasi 1–3 kalimat, maksimal dua berturut-turut.
- Dua titik pilihan per episode penuh (satu untuk mikro-episode), tiga opsi: satu mudah, satu benar tapi mahal, satu jalan tengah.
- Konsekuensi terasa dalam maksimal enam baris.
- Tidak ada tokoh ustadz yang menjelaskan; tidak ada pesan moral di dalam cerita; tidak ada azab instan; nabi dan sahabat tidak pernah menjadi tokoh.

## 5. Berani tapi beradab (tidak bisa ditawar)
1. Tarikan dan harganya, bukan mekanismenya. Tidak ada nama aplikasi judi, nominal deposit, cara main, atau tautan.
2. Adegan intim dipotong sebelum terjadi, lanjut dari akibatnya.
3. Konsekuensi nyata, bukan azab kartun.
4. Nikah siri sebagai pilihan sungguhan dengan harga sungguhan; dalil dan hukum negara berjalan bersama.
5. Kartu dalil tidak menghakimi tokoh.

Konsekuensi teknis: rating 17+ di Play Store; linter memblokir kata terlarang; pereview menerima aturan ini sebelum membaca.

## 6. Checklist QA sebelum rilis
- [ ] Tiga pesan pertama memancing tanpa menjelaskan.
- [ ] Tidak ada opsi yang jelas benar.
- [ ] Konsekuensi dirasakan dalam adegan.
- [ ] Register bahasa konsisten per relasi.
- [ ] Tidak ada ceramah di dalam cerita.
- [ ] Lima aturan "berani tapi beradab" terpenuhi.
- [ ] Kartu dalil lengkap: Arab, terjemah, perawi, nomor, derajat, pereview, tanggal.
- [ ] Refleksi satu pertanyaan.
- [ ] Teks bagikan tidak memuat pilihan pembaca.
- [ ] Minimal satu benang untuk episode berikutnya.
- [ ] Dibaca tuntas oleh satu orang yang tidak rajin salat tanpa merasa diceramahi.
- [ ] `pnpm qs lint` bersih; `status: reviewed` di `dalil.md`.

## 7. Standar kartu dalil
Urutan: judul; riwayat sejarah (ditandai bukan hadis, sumber kitab); ayat (Arab, terjemahan Kemenag, surah:ayat); hadis (terjemahan, perawi, nomor, derajat menurut siapa; daif tidak untuk hukum); catatan prinsip 1–3 kalimat tanpa "seharusnya" dan tanpa nama tokoh; "ulama berbeda" dengan dua pendapat dan rujukan bila ada; hukum negara satu baris bila relevan; "Direview oleh {nama}, {tanggal}".

Jangan pernah mengarang nomor hadis atau derajat. Kalau belum pasti, tulis "perlu verifikasi pereview".

## 8. Sumber cerita
Boleh: kisah klasik Islam (bebas hak cipta; tokoh modern menghadapi dilema paralel), pola dari rubrik konsultasi (ditulis ulang total, tanpa detail yang bisa ditelusuri), kiriman pengguna dengan izin tertulis, lingkaran founder dengan izin lisan dan minimal tiga detail diubah.
Dilarang: scraper berita atau media sosial, adaptasi karya berhak cipta tanpa lisensi, kisah tokoh publik yang masih hidup, kisah daif atau tanpa sumber sebagai dalil.
