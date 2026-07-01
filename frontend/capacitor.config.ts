import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Capacitor configuration for the UMNAAPP Android app.
 *
 * The SAME `dist/` web build is wrapped in a native WebView. No web behavior is
 * affected: this file is only read by the Capacitor CLI / native shell.
 *
 * Deep links handled by the App plugin + AndroidManifest intent filters:
 *   - umnaapp://...                          (custom scheme, incl. umnaapp://auth)
 *   - https://umnaapptst.testatozas.in/...   (App Links / universal links)
 */
const config: CapacitorConfig = {
  appId: 'in.testatozas.umnaapp',
  appName: 'UMNAAPP',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  plugins: {
    // Smoother first paint while the JS bundle boots.
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#0b1220',
      showSpinner: false,
    },
  },
}

export default config
