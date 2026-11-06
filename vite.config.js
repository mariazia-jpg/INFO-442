import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_BASE lets the GitHub Pages workflow serve the app from /<repo-name>/.
// Locally and in tests the app is served from the site root.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    base: process.env.VITE_BASE || env.VITE_BASE || '/',
    build: {
      // TensorFlow.js is large; it is only downloaded once a photo is chosen.
      chunkSizeWarningLimit: 2000,
    },
  };
});
