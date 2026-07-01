/**
 * Generates an Android signing keystore and writes android/keystore.properties.
 *
 * Usage:
 *   npm run keystore:generate
 *   npm run keystore:generate -- --alias umnaapp --storepass <pw> --keypass <pw>
 *
 * Defaults create android/keystore/umnaapp.keystore with a 10000-day validity.
 * KEEP THE PASSWORDS SAFE — losing them means you cannot update a published app.
 */
import { execSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const androidDir = path.join(root, 'android')
const keystoreDir = path.join(androidDir, 'keystore')

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const alias = arg('alias', 'umnaapp')
const storePassword = arg('storepass', crypto.randomBytes(16).toString('base64url'))
const keyPassword = arg('keypass', storePassword)
const fileName = 'umnaapp.keystore'
const keystorePath = path.join(keystoreDir, fileName)
const dname = arg('dname', 'CN=UMNAAPP, OU=Mobile, O=testatozas, L=NA, ST=NA, C=IN')

if (!fs.existsSync(androidDir)) {
  console.warn('[keystore] android/ not found yet — keystore will still be created under android/keystore/.')
}
fs.mkdirSync(keystoreDir, { recursive: true })

if (fs.existsSync(keystorePath)) {
  console.error(`[keystore] ${keystorePath} already exists. Delete it first to regenerate.`)
  process.exit(1)
}

const cmd = [
  'keytool', '-genkeypair', '-v',
  '-storetype', 'PKCS12',
  '-keystore', `"${keystorePath}"`,
  '-alias', alias,
  '-keyalg', 'RSA',
  '-keysize', '2048',
  '-validity', '10000',
  '-storepass', storePassword,
  '-keypass', keyPassword,
  '-dname', `"${dname}"`,
].join(' ')

try {
  console.log('[keystore] Generating keystore with keytool…')
  execSync(cmd, { stdio: 'inherit' })
} catch (err) {
  console.error('[keystore] keytool failed. Ensure a JDK is installed and on PATH.', err?.message || err)
  process.exit(1)
}

// keystore.properties is consumed by android/app/build.gradle signing config.
const propsPath = path.join(androidDir, 'keystore.properties')
const props = [
  `storeFile=keystore/${fileName}`,
  `storePassword=${storePassword}`,
  `keyAlias=${alias}`,
  `keyPassword=${keyPassword}`,
  '',
].join('\n')

fs.mkdirSync(androidDir, { recursive: true })
fs.writeFileSync(propsPath, props, 'utf8')

console.log('\n[keystore] Done.')
console.log(`  keystore:           ${keystorePath}`)
console.log(`  keystore.properties:${propsPath}`)
console.log('\n  >>> SAVE THESE CREDENTIALS SOMEWHERE SAFE <<<')
console.log(`  alias:        ${alias}`)
console.log(`  storePassword:${storePassword}`)
console.log(`  keyPassword:  ${keyPassword}`)
console.log('\n  Both keystore.properties and the .keystore file are gitignored.')
