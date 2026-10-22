// Analitik Umami tanpa data pribadi (SRS §8, ARCHITECTURE §9). Nama dan isi event hanya dari tabel
// SRS §8; tidak ada identitas perangkat, teks bebas, atau refleksi.

/** Isi setiap event menurut SRS §8. */
export type DataEvent = {
  poll: { pilih: string };
  mulai: { ep: string };
  pilihan: { ep: string; titik: string; pilih: string };
  selesai: { ep: string; jalur: string };
  bagikan: { ep: string };
  masukan: { ep: string };
  saluran: { dari: string };
};

export type EventName = keyof DataEvent;

type Umami = { track: (nama: string, data: Record<string, string>) => void };

/** Kirim event bila skrip Umami sudah termuat; bila belum, tidak dikonfigurasi, atau diblokir, diam. */
export function track<N extends EventName>(nama: N, data: DataEvent[N]) {
  try {
    (window as { umami?: Umami }).umami?.track(nama, data);
  } catch {
    // Analitik tidak boleh mengganggu pembaca.
  }
}

/** Memuat skrip Umami dari konfigurasi; tidak melakukan apa pun bila URL atau Website ID kosong. */
export function pasangUmami(skrip: string | null, websiteId: string | null) {
  if (skrip === null || websiteId === null) {
    return;
  }
  const el = document.createElement('script');
  el.defer = true;
  el.src = skrip;
  el.setAttribute('data-website-id', websiteId);
  document.head.appendChild(el);
}
