import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',  // chemins relatifs pour Vercel
  build: {
    outDir: 'dist',  // dossier de sortie
  },
});
