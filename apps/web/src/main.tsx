import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app.tsx';
import { UpdateBar } from './components/update-bar.tsx';
import { pasangUmami } from './lib/analytics.ts';
import { getConfig } from './lib/config.ts';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('Elemen #root tidak ada di index.html');
}

const config = getConfig();
pasangUmami(config.umamiScript, config.umamiId);

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// APK (ADR-020): status bar mengikuti tema. Service worker tidak dipasang, karena app shell ikut
// di dalam APK dan diperbarui lewat rilis APK. Kondisi mode ditulis langsung (bukan konstanta dari modul lain)
// supaya Rolldown membuang cabang dan impor dinamisnya dari build web.
if (import.meta.env.MODE === 'android') {
  void import('./lib/native.ts').then((m) => m.pasangNative());
}

// Root sendiri, supaya baris pembaruan tetap ada walau App gagal render; tanpa itu, pembaca yang terkena build
// rusak tidak bisa pindah ke versi perbaikan (ADR-017).
const wadahPembaruan =
  import.meta.env.MODE === 'android' ? null : document.getElementById('pembaruan');
if (wadahPembaruan !== null) {
  createRoot(wadahPembaruan).render(
    <StrictMode>
      <UpdateBar />
    </StrictMode>,
  );
}
