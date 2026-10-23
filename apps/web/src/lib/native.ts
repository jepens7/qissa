// Integrasi Android (SRS AND-2, ADR-020): status bar mengikuti tema, dan tautan https://qissah.id/#epNN
// membuka episodenya. Modul ini hanya dimuat dari cabang mode `android` di main.tsx.
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

  const buka = (url: string | undefined) => {
    const hash = url === undefined ? null : hashDariTautan(url);
    if (hash !== null) {
      window.location.hash = hash;
    }
  };
  // Saat APK dibuka lewat tautan dan saat tautan datang ketika APK sudah berjalan.
  buka((await App.getLaunchUrl())?.url);
  await App.addListener('appUrlOpen', (e) => {
    buka(e.url);
  });
}
