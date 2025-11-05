import { defineConfig } from 'vite';

export default defineConfig({
  base: './',  // permet aux chemins relatifs de fonctionner sur Vercel
  build: {
    outDir: 'dist',  // dossier de sortie
  },
});
