/**
 * Builds the signed Android APK + AAB and copies them to the canonical paths
 * at the REPO ROOT (vite empties frontend/dist on every web build):
 *   <repo-root>/dist/android/app.apk
 *   <repo-root>/dist/android/app.aab
 *
 * Prerequisites (one-time):
 *   1. npm run cap:add:android         (creates the android/ project)
 *   2. npm run keystore:generate       (or provide your own keystore.properties)
 *   3. Android SDK + JDK installed (ANDROID_HOME / JAVA_HOME set)
 *
 * Usage: npm run build:apk
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(root, '..')
const androidDir = path.join(root, 'android')

function run(cmd, cwd = root) {
  console.log(`\n[build-apk] $ ${cmd}`)
  execSync(cmd, { cwd, stdio: 'inherit' })
}

if (!fs.existsSync(androidDir)) {
  console.error(
    '[build-apk] android/ not found. Run `npm run cap:add:android` first ' +
      '(after `npm install`), then re-run this script.'
  )
  process.exit(1)
}

// 1. Build the web bundle for the Capacitor target and sync into android/.
run('npm run build:web:cap')
run('npx cap sync android')

// 2. Assemble signed release APK + AAB via the Gradle wrapper.
const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
run(`${gradlew} assembleRelease bundleRelease`, androidDir)

// 3. Collect outputs (repo-root dist/android — survives frontend web rebuilds).
// The Vite dev server serves these at /downloads/app.apk (see vite.config).
const outDir = path.join(repoRoot, 'dist', 'android')
fs.mkdirSync(outDir, { recursive: true })

const apkCandidates = [
  path.join(androidDir, 'app/build/outputs/apk/release/app-release.apk'),
  path.join(androidDir, 'app/build/outputs/apk/release/app-release-unsigned.apk'),
]
const aabPath = path.join(androidDir, 'app/build/outputs/bundle/release/app-release.aab')

const apkSrc = apkCandidates.find((p) => fs.existsSync(p))
if (apkSrc) {
  fs.copyFileSync(apkSrc, path.join(outDir, 'app.apk'))
  console.log(`[build-apk] APK → ${path.join(outDir, 'app.apk')}`)
  if (apkSrc.includes('unsigned')) {
    console.warn('[build-apk] WARNING: APK is UNSIGNED. Configure keystore.properties for a signed build.')
  }
} else {
  console.error('[build-apk] No APK produced. Check the Gradle output above.')
}

if (fs.existsSync(aabPath)) {
  fs.copyFileSync(aabPath, path.join(outDir, 'app.aab'))
  console.log(`[build-apk] AAB → ${path.join(outDir, 'app.aab')}`)
} else {
  console.warn('[build-apk] No AAB produced (bundleRelease).')
}
