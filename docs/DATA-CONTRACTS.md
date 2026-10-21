# Kontrak data — Qissa

Semua struktur yang melintasi batas antar-bagian. Perubahan di sini adalah perubahan API dan butuh pembaruan versi.

## 1. Konfigurasi lingkungan (`apps/web/.env`)

| Variabel | Contoh | Wajib |
| --- | --- | --- |
| `VITE_SITE_URL` | `https://qissa.id` | ya |
| `VITE_CONTENT_BASE` | `/content` | ya |
| `VITE_UMAMI_SCRIPT` | `https://umami.qissa.id/script.js` | tidak |
| `VITE_UMAMI_ID` | UUID | tidak |
| `VITE_WA_CHANNEL` | `https://whatsapp.com/channel/…` | tidak |
| `VITE_PB_URL` | `https://api.qissa.id` | tidak |
| `VITE_APP_VERSION` | diisi CI dari tag | ya |

`.env.example` dikomit; `.env` tidak.

## 2. `manifest.json`

```json
{
  "versi": 1,
  "episodes": [
    {
      "id": "ep01", "nomor": 1, "judul": "Tangkapan Layar", "teaser": "…",
      "durasi_menit": 5, "rating": "17+",
      "url": "/content/ep01.2026-11-01.1.json", "versi_konten": "2026-11-01.1",
      "review": { "status": "reviewed", "oleh": "…", "tanggal": "2026-11-10" },
      "rilis": "2026-11-04"
    }
  ]
}
```
- `versi`: naik bila bentuk manifest berubah; app menolak versi yang tidak dikenal dan memakai cache.
- `url` memuat `versi_konten`; berkas lama tetap disajikan selama 30 hari.
- `rilis` tanggal ISO, zona waktu Asia/Jakarta; episode tersembunyi sebelum tanggal itu.
- Produksi hanya memuat `review.status = "reviewed"`; CI menolak selainnya di branch `main`.

## 3. Episode JSON
Skema di `docs/QISSA-SCRIPT.md` §4; tipe TypeScript di `packages/script/src/types.ts` adalah sumber kebenaran; JSON Schema dihasilkan darinya ke `packages/script/schema/episode.schema.json` untuk validasi di CI.

## 4. Dalil (hasil `compileDalil`)
```ts
type Dalil = {
  status: 'draft' | 'reviewed'; reviewed_by: string | null; reviewed_at: string | null;
  sections: { kind: 'riwayat' | 'ayat' | 'hadis' | 'catatan' | 'hukum'; entries: Entry[] }[];
};
type Entry = { title?: string; lines: { kind: 'arab' | 'teks' | 'rujukan'; text: string }[] };
```

## 5. Penyimpanan perangkat
Awalan `qissa.v1.`; nilai JSON string.

| Kunci | Tipe | Contoh |
| --- | --- | --- |
| `qissa.v1.{ep}.akhir` | `string[]` | `["Ketemu dulu"]` |
| `qissa.v1.{ep}.jalur` | `string[]` | `["Tutup","Ketemu dulu"]` |
| `qissa.v1.{ep}.refleksi` | `string` | teks bebas |
| `qissa.v1.ep01.poll` | `string` | `"Tutup"` |
| `qissa.v1.manifest` | manifest | salinan terakhir |
| `qissa.v1.shell` | `string` | versi app |

Kuota: total di bawah 200 KB. Tidak ada data pribadi.

## 6. Event analitik
Nama dan data di `docs/SRS.md` §8. Semua nilai string pendek; tidak ada teks bebas, tidak ada ID.

## 7. PocketBase: koleksi `feedback`

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `episode` | text (≤ 8) | wajib |
| `jalur` | text (≤ 64) | opsional |
| `jawaban` | json (≤ 4 KB) | lima kunci: `skip`, `ketuaan`, `pilihan`, `ceramah`, `kirim` |
| `versi_app` | text (≤ 32) | wajib |
| `created` | auto | |

API rules: create = siapa pun; list, view, update, delete = admin. Hook: batas 5 create per IP per jam.

## 8. Teks bagikan
`bagikan` dari front matter + `\n` + `VITE_SITE_URL#epNN`. Tidak pernah memuat jalur atau refleksi.

## 9. Versi
- App shell: semver di `package.json` dan tag git `web-v1.2.0`; Android `versionName` sama, `versionCode` naik tiap rilis.
- Konten: `versi_konten` per episode `YYYY-MM-DD.n` dihitung `qs compile` dari tanggal dan hash isi.
- Manifest `versi` hanya naik bila bentuknya berubah.
