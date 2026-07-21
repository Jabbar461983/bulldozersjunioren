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
        // Bindet die Push-/Notification-Click-Handler (Phase 4) in den
        // generierten Service Worker ein.
        importScripts: ['push-sw.js'],
      },
      manifest: {
        name: 'Bulldozers Challenge',
        short_name: 'Bulldozers',
        description:
          'Uebungen fuer die Bulldozers Junioren zum Zuhause-Trainieren und Vergleichen.',
        // Vereinsfarben Streethockeyclub Bulldozers (Gruen/Gold). Pro Team kann dies
        // zur Laufzeit ueberschrieben werden (siehe src/lib/theme.ts).
        theme_color: '#0e6e45',
        background_color: '#ffffff',
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
