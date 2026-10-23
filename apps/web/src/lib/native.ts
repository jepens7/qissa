// Integrasi Android (SRS AND-2, ADR-020): status bar mengikuti tema, tautan https://qissah.id/#epNN membuka
// episodenya, dan tombol kembali Android. Modul ini hanya dimuat dari cabang mode `android` di main.tsx.
import { bacaRute } from './route.ts';

const LATAR = { terang: '#e3e8ec', gelap: '#090d11' } as const;

/** Hash `#epNN` dari tautan qissah.id yang membuka APK; null untuk tautan lain atau tanpa episode. */
export function hashDariTautan(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname === 'qissah.id' && bacaRute(u.hash).nama === 'episode' ? u.hash : null;
  } catch {
    return null;
  }
}

export async function pasangNative(): Promise<void> {
  const [{ App }, { StatusBar, Style }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/status-bar'),
  ]);

  const gelap = window.matchMedia('(prefers-color-scheme: dark)');
  const tema = () => {
    // Ikon terang di atas latar gelap, dan sebaliknya. Warna latar diabaikan Android 15 ke atas (edge-to-edge).
    void StatusBar.setStyle({ style: gelap.matches ? Style.Dark : Style.Light });
    void StatusBar.setBackgroundColor({ color: gelap.matches ? LATAR.gelap : LATAR.terang });
  };
  tema();
  gelap.addEventListener('change', tema);

  // Tautan yang membuka APK dari keadaan mati juga datang lewat appUrlOpen: Capacitor menahannya sampai ada
  // listener, jadi App.getLaunchUrl tidak dipakai.
  await App.addListener('appUrlOpen', (e) => {
    const hash = hashDariTautan(e.url);
    if (hash !== null) {
      window.location.hash = hash;
    }
  });

  // Tanpa listener, Capacitor hanya memakai riwayat WebView, padahal pindah layar memakai replaceState, sehingga
  // tombol kembali tidak berbuat apa-apa. Dari episode kembali ke home seperti pindah() di app.tsx; dari home,
  // APK pindah ke latar belakang.
  await App.addListener('backButton', () => {
    if (bacaRute(window.location.hash).nama === 'home') {
      void App.minimizeApp();
    } else {
      window.location.replace('#home');
      window.scrollTo(0, 0);
    }
  });
}
