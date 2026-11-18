import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Icons werden beim Build aus public/icon.svg erzeugt (siehe pwa-assets.config.ts)
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: 'EDKN Technik',
        short_name: 'EDKN Technik',
        description: 'Technischer Zustand der Vereinsflugzeuge und Mängelmeldungen',
        lang: 'de',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0f1b2d',
        background_color: '#f4f5f7',
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
      },
    }),
  ],
})
