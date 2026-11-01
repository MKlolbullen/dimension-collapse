import { defineConfig } from 'vite';

// `base: './'` keeps the built site relocatable (GitHub Pages sub-path, file://, etc.).
export default defineConfig({
  base: './',
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
});
