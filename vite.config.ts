import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // relative paths so the build works from any folder, including GitHub Pages
  base: './',
  plugins: [react()],
});
