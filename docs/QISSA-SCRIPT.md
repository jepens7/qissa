# Qissa Script (QS) — format naskah dan skema JSON

Qissa Script adalah notasi naskah yang sudah dipakai di dokumen Episode 1 dan 2, dibakukan agar bisa dikompilasi. Satu berkas `episode.qs.md` per episode, didampingi `dalil.md`. Compiler ada di `packages/script` dan menghasilkan JSON yang dimengerti `packages/engine`.

Prinsip: penulis menulis seperti menulis naskah; tidak ada tanda kurung kurawal atau sintaks pemrograman kecuali yang disebut di sini.

## 1. Struktur berkas

```
---
id: ep01
nomor: 1
judul: Tangkapan Layar
pov: Raka
durasi_menit: 5
rating: 17+
teaser: …
sampul: …
refleksi: …
bagikan: |
  …
berikutnya: ep02
vars: [dibaca, menegur]
---

::: shot nama-shot
…
:::

== nama_knot
…baris…
```

Semua key pada contoh di atas wajib ada (L6). `id` berbentuk `epNN` dan sama dengan awalan nama folder (`content/episodes/epNN-slug/`). Hanya `berikutnya` yang boleh kosong; kosong berarti episode terakhir (`null`). Knot pertama dalam berkas adalah knot awal.

Front matter ditulis dalam subset YAML yang dibaca sama oleh YAML 1.2:
- satu `key: nilai` per baris; key harus salah satu key di atas dan tidak boleh ganda; tab tidak boleh dipakai;
- blok `|` untuk teks beberapa baris; newline di akhir blok dipangkas;
- list `[a, b]` untuk `vars`;
- komentar `#` di awal baris atau setelah spasi;
- `nomor` dan `durasi_menit` bilangan bulat positif; nilai lain dibaca sebagai teks.

Nilai teks yang memuat `: ` atau ` #`, berakhir dengan `:`, diawali salah satu dari `- ? : , [ ] { } # & * ! | > ' " % @` atau backtick, dibaca YAML sebagai null, boolean, atau angka (mis. `null`, `~`, `true`, `2026`), atau berlanjut ke baris berikutnya, wajib ditulis sebagai blok `|`. Compiler menolaknya dengan nomor baris (S1), bukan memotongnya atau mengubah jenisnya diam-diam seperti YAML. `nomor` dan `durasi_menit` ditulis langsung, bukan sebagai blok. Pembatas `---` harus berada di baris pertama dan boleh diikuti komentar `#`.

Nama knot dan variabel: huruf kecil, angka, garis bawah, diawali huruf (`^[a-z][a-z0-9_]*$`). Nama shot boleh juga memakai `-`. Nama `constructor`, `prototype`, dan `__proto__` tidak boleh dipakai; `closed` dicadangkan untuk `@shot closed`, dan `else` serta `end` untuk blok `??`.

## 2. Jenis baris

Satu pernyataan per baris. Baris kosong diabaikan. Baris yang diawali `//` adalah komentar.

| Sintaks | Jenis | Dirender? | Keterangan |
| --- | --- | --- | --- |
| `== nama` | knot | tidak | Memulai knot baru |
| `@view Nama \| Inisial \| status \| label pil` | view | pil saja | Ganti chat aktif; header berubah; pil label ditampilkan. Label yang diawali "Grup" menandai tampilan grup |
| `> teks` | nar | ya | Kartu narasi (serif) |
| `Nama: teks` | in / out | ya | Gelembung chat. Jika `Nama` sama dengan `pov`, gelembung keluar; selain itu gelembung masuk. Di tampilan grup, nama pengirim ditampilkan |
| `Nama: [Label lampiran] teks` | in / out dengan attach | ya | Kurung siku di awal teks menjadi label lampiran |
| `@typing` | typing | ya (sementara) | Indikator mengetik, memblokir input, lalu otomatis merender baris berikutnya |
| `@shot closed` | shot | ya | Tangkapan layar belum dibuka |
| `@shot nama-shot` | shot | ya | Tangkapan layar dengan isi dari blok `::: shot nama-shot` |
| `@sys teks` | sys | ya | Pil sistem (mis. "Nadia keluar dari grup") |
| `@notif App \| teks \| jam` | notif | ya | Kartu notifikasi |
| `@bank Nominal \| PENGIRIM` | bank | ya | Kartu dana masuk m-banking |
| `@set var` | set | tidak | Variabel bernilai true (harus ada di `vars`) |
| `-> nama` | go | tidak | Divert ke knot |
| `-> END` | end | ya (penutup) | Tamat; UI lanjut ke kartu tamat, dalil, refleksi |
| `=> cond: knot \| cond2: knot2 \| knot_default` | branch | tidak | Pindah ke knot pertama yang kondisinya benar; yang terakhir tanpa kondisi adalah default dan wajib ada |
| `? cond: pernyataan` | kondisional satu baris | tergantung | Pernyataan hanya diproses bila `cond` benar; `? !cond:` untuk negasi |
| `?? cond` … `?? cond2` … `?? else` … `?? end` | blok kondisional | tergantung | Hanya cabang pertama yang benar yang diproses; `?? else` opsional; `?? end` wajib |
| `[Label] #kunci` | choice (label) | ya | Membuka blok pilihan; `#kunci` wajib (`p1`, `p2`) untuk snapshot |
| `* Teks opsi -> knot #NamaPendek` | opsi | ya | Tepat tiga opsi per blok; `#NamaPendek` wajib, dipakai untuk jalur dan analitik |

Kondisi (`cond`) hanya berupa nama variabel atau `!nama`. Tidak ada operator lain; kalau butuh logika lebih, itu tanda naskahnya terlalu rumit.

### Aturan pembacaan baris

- Spasi di awal dan akhir baris diabaikan; CRLF dibaca sama dengan LF. `//` hanya berarti komentar bila berada di awal baris.
- Jenis baris dikenali dari awalannya. Baris yang tidak cocok dengan awalan mana pun adalah `Nama: teks`, dipotong di `: ` yang pertama; nama dan teks tidak boleh kosong. Karena itu `Raka: [Foto: resi pengiriman] Udah dikirim ya bro` terbaca benar. Label lampiran `[…]` hanya dikenali di awal teks.
- `@view` punya tepat empat field, `@notif` tiga, `@bank` dua, dipisah `|`, dan tidak ada yang kosong. Direktif `@` lain ditolak. Kata kunci `?? else` dan `?? end` ditulis dengan huruf kecil.
- Blok pilihan: baris label langsung diikuti tepat tiga opsi. `#NamaPendek` berlaku sampai akhir baris, jadi boleh berspasi (`#Ga tau`), dan unik dalam satu blok. Kunci (`#p1`, `#p2`, …) unik dalam satu episode.
- Setiap knot diakhiri satu penutup: `-> knot`, `=> …`, blok pilihan, atau `-> END`. Knot tanpa penutup dan baris setelah penutup ditolak (L2).
- `? cond:` dan `??` hanya boleh membungkus narasi, gelembung, atau `@sys`, karena hanya jenis itu yang punya `cond` di §4. Untuk berpindah knot secara bersyarat, pakai `=>`. Keduanya tidak boleh bersarang.
- Blok `??` dengan lebih dari satu kondisi (tidak termasuk `?? else`) hanya boleh berisi tepat satu kartu narasi per cabang, karena `cond` tidak bisa menggabungkan dua kondisi.
- Tampilan aktif menentukan apakah gelembung masuk menampilkan nama pengirim. Gelembung masuk tidak boleh muncul sebelum `@view` pertama di episode, dan knot yang memuat gelembung masuk sebelum `@view`-nya sendiri harus selalu dimasuki dari tampilan yang sama jenisnya, grup atau bukan grup (S1).

## 3. Blok tangkapan layar

```
::: shot nadia-bram
cap: Tangkapan layar, chat Nadia
cut: dipotong di sini
pov: Nadia
Bram: Besok jadi ke rumah?
Nadia: InsyaAllah. Jam 7 ya, aku langsung dari kantor.
:::
```

- `cap` wajib. `cut` opsional (garis putus di atas, menandai potongan). `pov` menentukan gelembung mana yang rata kanan di dalam mini-chat.
- Untuk komentar media sosial: `cmt: handle | teks` menggantikan baris chat.

## 4. Skema JSON hasil kompilasi

```ts
type Episode = {
  format: number;                         // versi format JSON, sekarang 1 (ADR-015)
  id: string; nomor: number; judul: string; pov: string;
  meta: { teaser: string; sampul: string; durasi_menit: number; rating: string;
          refleksi: string; bagikan: string; berikutnya: string | null };
  vars: string[];
  start: string;
  knots: Record<string, Line[]>;
  shots: Record<string, Shot>;
  dalil: Dalil;                           // hasil compileDalil, struktur di DATA-CONTRACTS §4
};

type Cond = string;                       // "dibaca" atau "!dibaca"

type Line =
  | { t: 'view'; name: string; initial: string; sub: string; pill: string; group: boolean }  // group: label pil diawali "Grup"
  | { t: 'nar'; text: string; cond?: Cond }
  | { t: 'nar'; cases: { cond?: Cond; text: string }[] }
  | { t: 'in'; text: string; from?: string; cond?: Cond; attach?: string }  // from hanya di tampilan grup
  | { t: 'out'; text: string; cond?: Cond; attach?: string }
  | { t: 'typing' }
  | { t: 'shot'; state: 'closed' | string }
  | { t: 'sys'; text: string; cond?: Cond }
  | { t: 'notif'; app: string; text: string; time: string }
  | { t: 'bank'; amount: string; from: string }
  | { t: 'set'; v: string }
  | { t: 'go'; to: string }
  | { t: 'branch'; cases: { cond?: Cond; to: string }[] }
  | { t: 'choice'; key: string; label: string; options: { text: string; go: string; name: string }[] }
  | { t: 'end' };

type Shot = {
  cap: string; cut?: string; pov?: string;
  lines?: { from: string; text: string }[];
  cmt?: { handle: string; text: string };
};
```

Blok `??` dikompilasi menjadi `nar` dengan `cases` bila seluruh cabang berisi satu kartu narasi, juga bila hanya ada satu cabang; selain itu menjadi beberapa baris dengan `cond` masing-masing. `? cond: Nama: teks` menjadi baris `in`/`out` dengan `cond`.

`from` hanya ditulis pada gelembung masuk yang tampil di tampilan grup, sama seperti objek `EPISODES` di prototipe; UI menampilkan `from` apa adanya. Compiler melacak tampilan aktif lintas knot (§2).

Kompiler menjaga urutan baris persis seperti di naskah. Teks dikompilasi apa adanya; tanda kutip tipografis ditulis langsung di naskah. Urutan key mengikuti urutan pada tipe di atas, key opsional yang tidak berlaku tidak ditulis, dan JSON berindentasi dua spasi diakhiri newline. JSON tidak memuat nomor baris; diagnostik memakai tabel posisi internal compiler.

## 5. `dalil.md`

```
---
status: draft            # draft | reviewed
reviewed_by:             # nama pereview, kosong bila draft
reviewed_at:             # YYYY-MM-DD
---
## Riwayat
### Umar dan anak penjual susu
…teks…
Sumber: riwayat sejarah, bukan hadis; …

## Ayat
### QS Al-Hujurat 49:12
<teks Arab>
“terjemahan Kemenag”
Terjemahan Kemenag

## Hadis
### Definisi ghibah
“…”
HR Muslim no. 2589, sahih

## Catatan
…

## Ulama berbeda
### Pendapat pertama
…
Sumber: …
### Pendapat kedua
…
Sumber: …

## Hukum negara
…
```

Judul bagian (`## Riwayat`, `## Ayat`, `## Hadis`, `## Catatan`, `## Ulama berbeda`, `## Hukum negara`) tetap; yang kosong dihilangkan, dan saat dikompilasi bagian diurutkan menurut urutan baku itu (SRS DLL-1) apa pun urutannya di berkas. Judul lain atau judul ganda ditolak (S1). Baris Arab adalah baris yang memuat huruf Arab (blok Unicode Arab, termasuk harakat dan tanda waqaf) dan tidak memuat huruf Latin; dirender RTL. Baris terakhir tiap entri yang diawali "HR", "Terjemahan", atau "Sumber", atau yang memuat kata "HR", dirender sebagai rujukan (contoh: "Bagian dari hadis Jibril, HR Muslim no. 8, sahih").

`dalil.md` dibaca per baris, bukan sebagai Markdown: satu paragraf ditulis dalam satu baris, baris kosong diabaikan, dan teks diambil apa adanya. `###` memulai entri baru; bagian tanpa `###` (biasanya Catatan dan Hukum negara) menjadi satu entri tanpa judul. Front matter memakai subset YAML yang sama dengan §1: `status` hanya `draft` atau `reviewed`, `reviewed_at` berformat `YYYY-MM-DD`, dan nilai kosong berarti `null`. Hasil `compileDalil` ikut dalam JSON episode sebagai `dalil`.

`## Ulama berbeda` (jenis `ikhtilaf`, CONTENT-RULES §7) memuat dua pendapat, masing-masing satu entri `###` yang diakhiri baris rujukan berawalan "Sumber:". Kartu menampilkannya tanpa judul entri, seperti hadis, lalu menutupnya dengan kalimat dari i18n: "Tanyakan ustadz yang Anda percaya untuk kasus Anda." Jenis ini masuk `format: 1` karena ditambahkan sebelum deploy pertama, saat belum ada shell yang beredar (ADR-015).

## 6. Aturan linter (`qs lint`)

Setiap diagnostik punya kode, nama berkas (path relatif dari akar repo, pemisah `/`), nomor baris, dan pesan berbahasa Indonesia. Aturan per jalur (L2, L4, W1, W3) dihitung dengan menjelajahi semua kombinasi pilihan beserta nilai variabelnya. `qs lint` keluar dengan kode 1 bila ada error. Peringatan tidak menggagalkan CI; di GitHub Actions peringatan tampil sebagai anotasi.

Gagal (CI merah):
- S1 Sintaks dan struktur: baris atau direktif `@` tak dikenal; jumlah field `|` salah; baris sebelum knot pertama; knot, shot, atau judul bagian dalil ganda; blok `:::`, `??`, atau front matter yang tidak ditutup; front matter di luar subset §1; `=>` tanpa default; shot tanpa `cap`; isi `?` atau `??` yang tidak didukung; nama terlarang; tampilan aktif yang tidak pasti (§2); `content/manifest.json` yang bukan JSON sah atau entri `episodes` yang bukan objek ber-`id`.
- L1 Tepat tiga opsi per blok pilihan; setiap opsi punya `#NamaPendek` yang unik dalam bloknya; teks opsi maksimal 8 kata (token yang dipisah spasi).
- L2 Setiap `->`, `=>`, opsi, `@shot`, dan `berikutnya` merujuk ke knot, shot, atau episode yang ada; setiap knot bisa dicapai; setiap knot punya penutup tanpa baris sesudahnya; setiap jalur berakhir di `-> END` dalam 300 baris terlihat. Jalur yang masuk lagi ke knot dengan nilai variabel yang sama bisa berputar tanpa akhir, jadi dilaporkan di baris `->`, `=>`, atau opsi yang kembali. Penjelajahan berhenti di 1.000 jalur (episode dengan dua titik pilihan punya sembilan).
- L3 Setiap variabel yang dipakai dideklarasikan di `vars`; setiap variabel yang dideklarasikan di-`@set` setidaknya sekali.
- L4 `@typing` maksimal dua kali per jalur.
- L5 Kata terlarang (daftar di `packages/script/src/forbidden.ts`): nama aplikasi judi (disimpan hanya sebagai hash SHA-256, ADR-013), "deposit" (juga dengan klitika seperti "depositnya"; "deposito" tidak), "gacor" di luar nama grup "Gacor Family", nominal taruhan, tautan, dan tag HTML. Diperiksa di seluruh naskah, front matter, dan `dalil.md`, tanpa membedakan huruf besar-kecil.
  - Nominal taruhan: angka uang dalam jarak tiga kata dari "deposit", "depo", "taruhan", atau "bet", juga dengan klitika atau menempel pada angkanya.
  - Angka uang: angka yang didahului Rp atau IDR; angka yang diikuti satuan rb, ribu, k, jt, juta, atau miliar, menempel maupun dipisah spasi; angka berpemisah ribuan; atau angka polos minimal lima digit. Jam, hitungan, dan nomor pasal tanpa penanda uang tidak termasuk.
  - Tautan: `http://` atau `https://`, `www.`, host yang diikuti garis miring (`linktr.ee/nama`), alamat IP yang diikuti garis miring, atau domain berakhiran umum (`.com`, `.id`, `.vip`, dan lainnya di `kata-terlarang.ts`). Nama akun `cmt:` yang berbentuk domain juga terhitung tautan.
- L6 Front matter lengkap (§1) dan `id` sama dengan awalan folder; `refleksi` tepat satu kalimat yang berakhir dengan "?"; `bagikan` tidak memuat "pilih" atau "jalur", termasuk di dalam kata lain seperti "pilihan"; `nomor`, `judul`, `teaser`, dan `durasi_menit` di `content/manifest.json` sama dengan front matter; setiap episode hanya sekali di `content/manifest.json`, dan `url`-nya (bila ditulis) `/content/epNN.json`.
- L7 `dalil.md` ada dan memiliki minimal satu entri ayat atau hadis dengan rujukan; bila `status: reviewed`, `reviewed_by` dan `reviewed_at` tidak kosong; `review` di `content/manifest.json` sama dengan front matter `dalil.md`. Dengan `qs lint --wajib-review`, episode yang belum `reviewed` juga error (gerbang produksi, ADR-012).

Peringatan (CI kuning):
- W1 Lebih dari dua kartu narasi berturut-turut di satu jalur, termasuk melintasi knot. Baris terlihat lain apa pun, termasuk pil dan notifikasi, memutus rangkaian.
- W2 Gelembung (in/out) dengan teks lebih dari 160 karakter; label lampiran tidak dihitung.
- W3 Lebih dari 220 baris terlihat di jalur terpanjang. Baris terlihat: pil `@view`, narasi, gelembung, shot, `@sys`, notifikasi, kartu bank, dan blok pilihan (dihitung satu); `@typing` tidak dihitung.
- W4 Kata yang masuk daftar "ketuaan" (`packages/script/src/dated-words.ts`), dicocokkan per kata tanpa membedakan huruf besar-kecil. Daftar awalnya berasal dari riset sumber tertulis, lalu diperbarui dari masukan pembaca Gen Z.

## 7. Contoh singkat

```
== pembuka
@view Gilang | G | online | Chat dengan Gilang
> Selasa, 22.41. Kos Kukusan, Depok.
Gilang: rak
Raka: masih lah. knp
@shot closed
[Pilihan 1 dari 2] #p1
* Buka dan baca semuanya -> baca #Buka
* Tutup, jangan dibuka -> tutup #Tutup
* Balas: “Kenapa lu kirim ke gue?” -> tegur #Tegur

== baca
@set dibaca
@shot nadia-bram
-> pagi
```

Contoh lengkap: `content/episodes/ep01-tangkapan-layar/episode.qs.md` dan `ep02-transferan-nyasar`.
