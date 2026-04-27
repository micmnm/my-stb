import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Static stop / route metadata: stale-while-revalidate.
            urlPattern: ({ url }) =>
              url.pathname.match(/^\/api\/stops\/[^/]+$/) !== null
              || url.pathname.match(/^\/api\/routes\/[^/]+\/detail$/) !== null,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'stb-meta',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            // Live arrivals + alerts: network-first with 3 s timeout, fall back to cache.
            urlPattern: ({ url }) =>
              url.pathname.match(/^\/api\/stops\/[^/]+\/arrivals$/) !== null
              || url.pathname === '/api/alerts'
              || url.pathname === '/api/stops/arrivals/peek',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'stb-live',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
            },
          },
        ],
      },
    }),
  ],
});
