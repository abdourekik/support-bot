import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Demo shop site (npm run dev / npm run build:site).
// envDir points to the project root so the single support-bot/.env is used.
// Only VITE_* variables are exposed to the browser.
export default defineConfig({
  plugins: [react()],
  envDir: '..',
  server: { port: 5173, strictPort: true },
});
