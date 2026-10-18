import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Embeddable widget (npm run build:embed): one self-contained script,
// dist-embed/maison-nora-chat.js, with React and the CSS bundled in.
export default defineConfig({
  plugins: [react()],
  envDir: '..',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'dist-embed',
    emptyOutDir: true,
    lib: {
      entry: 'src/embed.tsx',
      name: 'MaisonNoraChat',
      formats: ['iife'],
      fileName: () => 'maison-nora-chat.js',
    },
  },
});
