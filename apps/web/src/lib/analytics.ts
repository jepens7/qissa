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

/**
 * Event yang terjadi selama skrip Umami masih dimuat, misalnya `mulai` pada kunjungan pertama lewat `#epNN`;
 * dikirim berurutan begitu skrip termuat. null saat tidak sedang memuat (Umami tidak dikonfigurasi, sudah
 * termuat, atau gagal dimuat), sehingga event yang tidak bisa dikirim dibuang.
 */
let antrean: [EventName, DataEvent[EventName]][] | null = null;

/** Kirim event bila skrip Umami sudah termuat, antre bila masih dimuat; selain itu diam. */
export function track<N extends EventName>(nama: N, data: DataEvent[N]) {
  try {
    const umami = (window as { umami?: Umami }).umami;
    if (umami === undefined) {
      antrean?.push([nama, data]);
    } else {
      umami.track(nama, data);
    }
  } catch {
    // Analitik tidak boleh mengganggu pembaca.
  }
}

/** Memuat skrip Umami dari konfigurasi; tidak melakukan apa pun bila URL atau Website ID kosong. */
export function pasangUmami(skrip: string | null, websiteId: string | null) {
  if (skrip === null || websiteId === null) {
    return;
  }
  // Parameter URL (mis. fbclid atau utm_* dari media sosial) tidak ikut terkirim (PRIVACY-SECURITY §1). App tidak
  // memakai query string (routing hash), jadi query dibuang dari URL sebelum skrip dipasang: pageview pertama
  // Umami memakai location.href apa adanya, sedangkan data-exclude-search hanya berlaku saat pindah layar.
  if (window.location.search !== '') {
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
  }
  const el = document.createElement('script');
  el.defer = true;
  el.src = skrip;
  el.setAttribute('data-website-id', websiteId);
  el.setAttribute('data-exclude-search', 'true');
  antrean = [];
  el.onload = () => {
    const tertunda = antrean ?? [];
    antrean = null;
    for (const [nama, data] of tertunda) {
      track(nama, data);
    }
  };
  el.onerror = () => {
    antrean = null;
  };
  document.head.appendChild(el);
}
