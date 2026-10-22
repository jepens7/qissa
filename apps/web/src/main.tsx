import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app.tsx';
import './styles/tokens.css';
import './styles/base.css';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('Elemen #root tidak ada di index.html');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
