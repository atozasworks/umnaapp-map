import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Build target switch (ADDITIVE — defaults to the original web build).
 *   UMNA_TARGET=electron → base './' (file:// assets) + service worker disabled.
 *   UMNA_TARGET=capacitor → keep base '/' and the PWA/SW (WebView serves from a root).
 *   unset / anything else → original web/PWA build, byte-for-byte unchanged.
 */
const BUILD_TARGET = process.env.UMNA_TARGET || 'web'
const isElectronBuild = BUILD_TARGET === 'electron'

/**
 * Dev-only: serve packaged native artifacts at /downloads/* from the repo-root
 * dist/ (dist/windows/UmnaAppSetup.exe, dist/android/app.apk|app.aab) so the
 * landing-page "Install App" download buttons work during `npm run dev` without
 * bundling huge binaries into the web build. In production, host these files and
 * point VITE_APK_URL / VITE_EXE_URL at them.
 */
function serveDownloads() {
  const repoDist = path.resolve(__dirname, '..', 'dist')
  return {
    name: 'umna-serve-downloads',
    configureServer(server) {
      server.middlewares.use('/downloads', (req, res, next) => {
        const fileName = path.basename((req.url || '').split('?')[0])
        if (!fileName) return next()
        const candidates = [
          path.join(repoDist, 'windows', fileName),
          path.join(repoDist, 'android', fileName),
        ]
        const file = candidates.find((f) => fs.existsSync(f))
        if (!file) return next()
        res.setHeader('Content-Type', 'application/octet-stream')
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
        fs.createReadStream(file).pipe(res)
      })
    },
  }
}

const atozasAuthKitPath = (() => {
  const pkg = 'atozas-react-auth-kit'
  const candidates = [
    path.resolve(__dirname, 'node_modules', pkg, 'src'),
    path.resolve(__dirname, '..', 'node_modules', pkg, 'src'),
  ]
  return candidates.find((p) => fs.existsSync(p)) || candidates[1]
})()

export default defineConfig({
  // Electron loads from file:// so assets must be relative. Web/PWA keeps '/'.
  base: isElectronBuild ? './' : '/',
  plugins: [
    react(),
    serveDownloads(),
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,webmanifest,json}'],
      },
      // The generated service worker is only ever registered on web/Capacitor
      // (see PwaShell). For the Electron build we keep the plugin so the
      // `virtual:pwa-register` import still resolves, but never register the SW
      // and self-destroy any stale one under file://.
      selfDestroying: isElectronBuild,
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
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
