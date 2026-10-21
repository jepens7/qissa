import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    // SRS NFR-6: Android Chrome 90+, Samsung Internet 15+ (setara Chrome 90), Safari iOS 15+.
    target: ['chrome90', 'safari15'],
  },
});
