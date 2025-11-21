import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base './' allows the app to run at any path, essential for GitHub Pages project sites
  // e.g., https://username.github.io/repo-name/
  base: './',
  build: {
    outDir: 'dist',
  }
});