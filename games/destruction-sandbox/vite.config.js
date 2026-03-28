import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 3000,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
});
