// Kerangka aplikasi; routing lengkap menyusul di D8, layar home dan pemutar di D3–D5 (docs/PLAN.md).
import { useEffect, useState } from 'react';
import { DebugPage } from './features/debug/debug-page.tsx';

export function App() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const ubah = () => {
      setHash(window.location.hash);
    };
    window.addEventListener('hashchange', ubah);
    return () => {
      window.removeEventListener('hashchange', ubah);
    };
  }, []);

  return hash === '#debug' ? <DebugPage /> : <main />;
}
