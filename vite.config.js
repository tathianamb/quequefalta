import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const UM_ANO = 60 * 60 * 24 * 365

export default defineConfig({
  base: '/quequefalta/',
  build: {
    rolldownOptions: {
      output: {
        // Bibliotecas em pacotes próprios: o cache do service worker só se
        // invalida quando elas mudam, não a cada deploy do código do app.
        // As funções do Firebase ficam à parte (só carregam no primeiro envio do chat).
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/](@firebase[\\/](?!functions)|firebase[\\/](?!functions)|idb[\\/])/, priority: 20 },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Fontes do Google no cache para funcionarem sem sinal.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-css',
              expiration: { maxEntries: 10, maxAgeSeconds: UM_ANO },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-arquivos',
              expiration: { maxEntries: 30, maxAgeSeconds: UM_ANO },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'QueQueFalta',
        short_name: 'QQF',
        lang: 'pt-BR',
        id: '/quequefalta/',
        description: 'Lista de compras compartilhada',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/quequefalta/',
        scope: '/quequefalta/',
        icons: [
          {
            src: 'qqf-icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'qqf-icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})