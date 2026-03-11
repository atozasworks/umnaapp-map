import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

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
  plugins: [react()],
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
    // HMR - use localhost; set hmr: false if WebSocket errors persist
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 3000,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true
      }
    }
  },
  optimizeDeps: {
    include: ['@react-oauth/google', 'atozas-traslate'],
    esbuildOptions: {
      loader: {
        '.ts': 'ts',
        '.tsx': 'tsx',
        '.js': 'jsx', // atozas-traslate has JSX in .js files
      },
    },
  },
  // Ensure TypeScript files are processed correctly
  esbuild: {
    loader: 'tsx',
    include: /src\/.*\.[jt]sx?$/,
    exclude: [],
  },
})

