import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' -> funziona su GitHub Pages, Netlify, Vercel, Cloudflare Pages senza configurazione
export default defineConfig({
  base: './',
  plugins: [react()],
})
