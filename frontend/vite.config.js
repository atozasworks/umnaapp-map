import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import viteCompression from 'vite-plugin-compression'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const atozasAuthKitPath = (() => {
  const pkg = 'atozas-react-auth-kit'
  const candidates = [
    path.resolve(__dirname, 'node_modules', pkg, 'src'),
    path.resolve(__dirname, '..', 'node_modules', pkg, 'src'),
  ]
  return candidates.find((p) => fs.existsSync(p)) || candidates[1]
})()

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectRegister: false,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'splash-screen.png'],
      manifest: {
        name: 'UMNAAPP - Map Platform',
        short_name: 'UMNAAPP',
        description: 'Map-based platform for exploring, saving places, and real-time sync.',
        theme_color: '#0284c7',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        categories: ['navigation', 'maps', 'productivity'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      manifestFilename: 'manifest.json',
      injectManifest: {
        // Precache shell assets; large map chunks stay runtime-cached / on-demand.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,avif,woff2,woff,webmanifest,json}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
    // Emit .gz / .br siblings for static hosts / nginx gzip_static / brotli_static
    viteCompression({ algorithm: 'gzip', ext: '.gz', threshold: 1024 }),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br', threshold: 1024 }),
  ],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('maplibre-gl')) return 'maplibre'
          if (id.includes('socket.io')) return 'socket'
          if (id.includes('@turf')) return 'turf'
          if (id.includes('atozas-traslate') || id.includes('atozas-react-auth-kit')) {
            return 'atozas'
          }
          if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) {
            return 'react-vendor'
          }
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: {
      'atozas-react-auth-kit': atozasAuthKitPath,
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },
  server: {
    port: 3000,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 3000,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
      },
      // Dev proxy → umnaapp.in India OSM tiles (same as umnaapp.in/map).
      '/map-tiles': {
        target: 'https://umnaapp.in',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/map-tiles/, '/tiles'),
        secure: true,
      },
    },
  },
  optimizeDeps: {
    include: ['@react-oauth/google', 'atozas-traslate'],
    esbuildOptions: {
      loader: {
        '.ts': 'ts',
        '.tsx': 'tsx',
        '.js': 'jsx',
      },
    },
  },
  esbuild: {
    loader: 'tsx',
    include: /src\/.*\.[jt]sx?$/,
    exclude: [],
  },
})
