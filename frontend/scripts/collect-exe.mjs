/**
 * Copies the electron-builder NSIS installer to the canonical build-output path:
 *   frontend/release/UmnaAppSetup.exe  →  <repo-root>/dist/windows/UmnaAppSetup.exe
 *
 * The repo-root dist/ is used (not frontend/dist) because `vite build` empties
 * frontend/dist on every web build. Run automatically by `npm run build:exe`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(frontendRoot, '..')
const src = path.join(frontendRoot, 'release', 'UmnaAppSetup.exe')

if (!fs.existsSync(src)) {
  console.error(`[collect-exe] Installer not found at ${src}. Did electron-builder run?`)
  process.exit(1)
}

// Canonical build output (repo-root dist/windows). The Vite dev server serves
// this at /downloads/UmnaAppSetup.exe (see serveDownloads plugin in vite.config).
// In production, host the file and point VITE_EXE_URL at it.
const distDest = path.join(repoRoot, 'dist', 'windows', 'UmnaAppSetup.exe')
fs.mkdirSync(path.dirname(distDest), { recursive: true })
fs.copyFileSync(src, distDest)
console.log(`[collect-exe] Copied installer → ${distDest}`)
