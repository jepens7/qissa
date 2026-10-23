// Integrasi Android (SRS AND-2, ADR-020): status bar mengikuti tema. Modul ini hanya dimuat dari cabang mode
// `android` di main.tsx.

const LATAR = { terang: '#e3e8ec', gelap: '#090d11' } as const;

export async function pasangNative(): Promise<void> {
  const { StatusBar, Style } = await import('@capacitor/status-bar');

  const gelap = window.matchMedia('(prefers-color-scheme: dark)');
  const tema = () => {
    // Ikon terang di atas latar gelap, dan sebaliknya. Warna latar diabaikan Android 15 ke atas (edge-to-edge).
    void StatusBar.setStyle({ style: gelap.matches ? Style.Dark : Style.Light });
    void StatusBar.setBackgroundColor({ color: gelap.matches ? LATAR.gelap : LATAR.terang });
  };
  tema();
  gelap.addEventListener('change', tema);
}
