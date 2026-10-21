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

Front matter YAML wajib memuat `id`, `nomor`, `judul`, `pov`, `vars`. Knot pertama dalam berkas adalah knot awal. Nama knot: huruf kecil, angka, garis bawah.

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
  id: string; nomor: number; judul: string; pov: string;
  meta: { teaser: string; sampul: string; durasi_menit: number; rating: string;
          refleksi: string; bagikan: string; berikutnya: string | null };
  vars: string[];
  start: string;
  knots: Record<string, Line[]>;
  shots: Record<string, Shot>;
};

type Cond = string;                       // "dibaca" atau "!dibaca"

type Line =
  | { t: 'view'; name: string; initial: string; sub: string; pill: string; group: boolean }
  | { t: 'nar'; text: string; cond?: Cond }
  | { t: 'nar'; cases: { cond?: Cond; text: string }[] }
  | { t: 'in'; text: string; from?: string; cond?: Cond; attach?: string }
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

Blok `??` dikompilasi menjadi `nar` dengan `cases` bila seluruh cabang berisi satu kartu narasi; selain itu menjadi beberapa baris dengan `cond` masing-masing. `? cond: Nama: teks` menjadi baris `in`/`out` dengan `cond`.

Kompiler menjaga urutan baris persis seperti di naskah. Teks dikompilasi apa adanya; tanda kutip tipografis ditulis langsung di naskah.

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

## Hukum negara
…
```

Judul bagian (`## Riwayat`, `## Ayat`, `## Hadis`, `## Catatan`, `## Hukum negara`) tetap; yang kosong dihilangkan. Baris Arab dideteksi dari karakter Arab dan dirender RTL. Baris terakhir tiap entri yang diawali "HR", "Terjemahan", atau "Sumber" dirender sebagai rujukan.

## 6. Aturan linter (`qs lint`)

Gagal (CI merah):
- L1 Tepat tiga opsi per blok pilihan; setiap opsi punya `#NamaPendek`; teks opsi maksimal 8 kata.
- L2 Setiap `->`, `=>`, dan opsi merujuk ke knot yang ada; setiap knot bisa dicapai; setiap jalur berakhir di `-> END`.
- L3 Setiap variabel yang dipakai dideklarasikan di `vars`; setiap variabel yang dideklarasikan di-`@set` setidaknya sekali.
- L4 `@typing` maksimal dua kali per jalur.
- L5 Kata terlarang (daftar di `packages/script/src/forbidden.ts`): nama aplikasi judi, "deposit", "gacor" di luar nama grup "Gacor Family", nominal taruhan, tautan.
- L6 Front matter lengkap; `refleksi` satu kalimat tanya; `bagikan` tidak memuat kata "pilih" atau "jalur".
- L7 `dalil.md` memiliki minimal satu ayat atau hadis dengan rujukan; bila `status: reviewed`, `reviewed_by` dan `reviewed_at` tidak kosong.

Peringatan (CI kuning):
- W1 Lebih dari dua kartu narasi berturut-turut.
- W2 Gelembung lebih dari 160 karakter.
- W3 Episode lebih dari 220 baris yang dirender di jalur terpanjang.
- W4 Kata yang masuk daftar "ketuaan" (`packages/script/src/dated-words.ts`, diisi dari masukan pembaca Gen Z).

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
