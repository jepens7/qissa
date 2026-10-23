import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app.tsx';
import { UpdateBar } from './components/update-bar.tsx';
import { pasangUmami } from './lib/analytics.ts';
import { getConfig } from './lib/config.ts';
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

// Root sendiri, supaya baris pembaruan tetap ada walau App gagal render; tanpa itu, pembaca yang terkena build
// rusak tidak bisa pindah ke versi perbaikan (ADR-017).
const wadahPembaruan = document.getElementById('pembaruan');
if (wadahPembaruan !== null) {
  createRoot(wadahPembaruan).render(
    <StrictMode>
      <UpdateBar />
    </StrictMode>,
  );
}
