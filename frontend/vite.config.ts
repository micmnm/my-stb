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
            urlPattern: /^https:\/\/(?:[abc]\.)?tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Static stop metadata: stale-while-revalidate.
            urlPattern: ({ url }) => url.pathname.match(/^\/api\/stops\/[^/]+$/) !== null,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'stb-meta',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            // Live data is never served from cache: a stale reply would look live.
            urlPattern: ({ url }) =>
              url.pathname.match(/^\/api\/stops\/[^/]+\/arrivals$/) !== null
              || url.pathname.match(/^\/api\/routes\/[^/]+\/detail$/) !== null
              || url.pathname === '/api/alerts'
              || url.pathname === '/api/stops/arrivals/peek',
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
});
