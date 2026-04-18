import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts': ['recharts'],
          'vendor-ui': ['lucide-react', 'date-fns'],
          'vendor-dnd': ['@hello-pangea/dnd'],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.png', 'favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png',
        'favicon-48x48.png', 'apple-touch-icon.png', 'logo.png',
        'notification_sound.mp3', 'browserconfig.xml',
        'icons/*.png',
      ],
      manifest: {
        name: 'G-Track — Garage Collective',
        short_name: 'G-Track',
        description: 'Project management dashboard for Garage Collective',
        theme_color: '#0A5540',
        background_color: '#0A5540',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        lang: 'en',
        categories: ['productivity', 'business'],
        icons: [
          { src: '/icons/icon-72x72.png',              sizes: '72x72',   type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-96x96.png',              sizes: '96x96',   type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-128x128.png',            sizes: '128x128', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-144x144.png',            sizes: '144x144', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-152x152.png',            sizes: '152x152', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-192x192.png',            sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-256x256.png',            sizes: '256x256', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-384x384.png',            sizes: '384x384', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512x512.png',            sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-192x192-maskable.png',   sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-512x512-maskable.png',   sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Dashboard',
            short_name: 'Dashboard',
            description: 'Go to your dashboard',
            url: '/app/dashboard',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
          },
          {
            name: 'Tasks',
            short_name: 'Tasks',
            description: 'View and manage tasks',
            url: '/app/tasks',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
