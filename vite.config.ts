import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Basis-Caching: App-Shell (JS/CSS/HTML/Icons) offline verfuegbar.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
      manifest: {
        name: 'Streethockey Junioren-Tracker',
        short_name: 'SH Tracker',
        description:
          'Uebungen fuer Streethockey Junioren zum Zuhause-Trainieren und Vergleichen.',
        // Platzhalter-Theme-Farben, werden in spaeteren Phasen ggf. pro Team angepasst.
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
