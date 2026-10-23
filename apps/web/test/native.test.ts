// SRS AND-2 (BACKLOG H3): tautan https://qissah.id/#epNN yang membuka APK diarahkan ke episodenya, dan tombol
// kembali Android keluar dari episode lalu dari APK.
import { afterEach, expect, test, vi } from 'vitest';
import { hashDariTautan, pasangNative } from '../src/lib/native.ts';

const { App, listener } = vi.hoisted(() => {
  const listener = new Map<string, (e: { url?: string }) => void>();
  return {
    listener,
    App: {
      addListener: vi.fn((nama: string, f: (e: { url?: string }) => void) => {
        listener.set(nama, f);
        return Promise.resolve({ remove: () => Promise.resolve() });
      }),
      minimizeApp: vi.fn(() => Promise.resolve()),
    },
  };
});
vi.mock('@capacitor/app', () => ({ App }));
vi.mock('@capacitor/status-bar', () => ({
  StatusBar: { setStyle: () => Promise.resolve(), setBackgroundColor: () => Promise.resolve() },
  Style: { Dark: 'DARK', Light: 'LIGHT' },
}));

const g = globalThis as { window?: unknown };

/** window palsu secukupnya untuk pasangNative; location.replace hanya dipakai dengan hash. */
function jendelaPalsu(hash: string) {
  const location = {
    hash,
    replace: (url: string) => {
      location.hash = url;
    },
  };
  g.window = {
    location,
    matchMedia: () => ({ matches: false, addEventListener: () => undefined }),
    scrollTo: () => undefined,
  };
  return location;
}

afterEach(() => {
  delete g.window;
  listener.clear();
  vi.clearAllMocks();
});

test('tautan episode qissah.id menjadi hash rute; tautan lain diabaikan', () => {
  expect(hashDariTautan('https://qissah.id/#ep02')).toBe('#ep02');
  expect(hashDariTautan('https://qissah.id/?fbclid=x#ep01')).toBe('#ep01');
  expect(hashDariTautan('https://qissah.id/')).toBeNull();
  expect(hashDariTautan('https://qissah.id/#home')).toBeNull();
  expect(hashDariTautan('https://contoh.com/#ep02')).toBeNull();
  expect(hashDariTautan('bukan url')).toBeNull();
});

test('appUrlOpen membuka episode dari tautan qissah.id', async () => {
  const location = jendelaPalsu('#home');
  await pasangNative();
  listener.get('appUrlOpen')?.({ url: 'https://qissah.id/#ep02' });
  expect(location.hash).toBe('#ep02');
  listener.get('appUrlOpen')?.({ url: 'https://contoh.com/#ep01' });
  expect(location.hash).toBe('#ep02');
});

test('tombol kembali: dari episode ke home, dari home APK ke latar belakang', async () => {
  const location = jendelaPalsu('#ep01');
  await pasangNative();
  const kembali = listener.get('backButton');
  kembali?.({});
  expect(location.hash).toBe('#home');
  expect(App.minimizeApp).not.toHaveBeenCalled();
  kembali?.({});
  expect(location.hash).toBe('#home');
  expect(App.minimizeApp).toHaveBeenCalledOnce();
});
