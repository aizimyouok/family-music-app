import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon-*.png'],
      manifest: {
        name: '🎵 Music Hub - 가족 음악 앱',
        short_name: 'Music Hub',
        description: '가족이 함께 즐기는 YouTube 음악 플레이어',
        theme_color: '#1f2937',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/family-music-app/',
        start_url: '/family-music-app/',
        icons: [
          {
            src: 'icon-16x16.png',
            sizes: '16x16',
            type: 'image/png'
          },
          {
            src: 'icon-32x32.png',
            sizes: '32x32',
            type: 'image/png'
          },
          {
            src: 'icon-48x48.png',
            sizes: '48x48',
            type: 'image/png'
          },
          {
            src: 'icon-72x72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: 'icon-96x96.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: 'icon-144x144.png',
            sizes: '144x144',
            type: 'image/png'
          },
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'apple-touch-icon'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/img\.youtube\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'youtube-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30일
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets'
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  base: '/family-music-app/', // GitHub Pages 프로젝트 페이지용
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
