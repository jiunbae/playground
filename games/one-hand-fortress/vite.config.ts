import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    host: true,
  },
  build: {
    target: 'es2020',
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
