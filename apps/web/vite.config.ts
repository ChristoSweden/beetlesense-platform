/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import removeConsole from 'vite-plugin-remove-console';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.NODE_ENV === 'production' ? [removeConsole()] : []),
    process.env.ANALYZE && visualizer({
      open: false,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB — accommodate Cesium vendor chunk
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
          {
            // Cache OSM tiles for field mode — cache-first, 30-day TTL
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'field-mode-tiles',
              expiration: { maxEntries: 2000, maxAgeSeconds: 2592000 }, // 30 days
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache Supabase API calls (REST/RPC) — essential for seeing data offline
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 200, maxAgeSeconds: 86400 }, // 24h
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache map tiles (any tile server) — cache-first, 7-day TTL
            urlPattern: /^https:\/\/.*tile.*|.*\.tile\..*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 604800 }, // 7 days
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache satellite imagery — cache-first, 30-day TTL
            urlPattern: /^https:\/\/.*(?:satellite|sentinel|copernicus|imagery|ortho).*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'satellite-imagery',
              expiration: { maxEntries: 100, maxAgeSeconds: 2592000 }, // 30 days
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],

      },
      manifest: {
        name: 'BeetleSense — Forest Intelligence Platform',
        short_name: 'BeetleSense',
        description: 'AI-powered bark beetle detection and forest health monitoring',
        theme_color: '#030d05',
        background_color: '#030d05',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        categories: ['business', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@beetlesense/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  define: {},
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 850,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor splits
          if (id.includes('node_modules')) {
            if (id.includes('react-dom')) return 'vendor-react';
            if (id.includes('react-router')) return 'vendor-react';
            if (id.includes('maplibre-gl')) return 'vendor-maplibre';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('i18next')) return 'vendor-i18n';
            if (id.includes('zustand')) return 'vendor-zustand';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('/three/') || id.includes('\\three\\')) return 'vendor-three';
            // cesium/resium removed — no longer needed
          }
          // Route-based page splits
          if (id.includes('/pages/pilot/')) return 'pages-pilot';
          if (id.includes('/pages/inspector/')) return 'pages-inspector';
          if (id.includes('/pages/admin/')) return 'pages-admin';
          if (id.includes('/pages/public/')) return 'pages-public';
          // Large data files
          if (id.includes('knowledge-base-sources') || id.includes('forestryGlossaryData') || id.includes('academyStore')) return 'data-static';
        },
      },
    },
  },
});
