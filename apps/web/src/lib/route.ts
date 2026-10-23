// Routing hash (ARCHITECTURE §6, BACKLOG D8): #home, #epNN, dan #debug. Pindah layar memakai
// history.replaceState, jadi tidak menambah riwayat untuk setiap ketukan. #debug hanya ada saat vite dev, karena
// halamannya menampilkan kartu dalil semua episode tanpa memainkan cerita (prinsip 2, BACKLOG F1).

export type Rute = { nama: 'home' } | { nama: 'episode'; id: string } | { nama: 'debug' };

/** Hash yang tidak dikenal kembali ke home. */
export function bacaRute(hash: string): Rute {
  const isi = hash.replace(/^#/, '');
  if (isi === 'debug' && import.meta.env.DEV) {
    return { nama: 'debug' };
  }
  if (/^ep\d{2,}$/.test(isi)) {
    return { nama: 'episode', id: isi };
  }
  return { nama: 'home' };
}

export function hashRute(rute: Rute): string {
  switch (rute.nama) {
    case 'home':
      return '#home';
    case 'debug':
      return '#debug';
    case 'episode':
      return `#${rute.id}`;
  }
}
