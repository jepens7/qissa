import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app.tsx';
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
