import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initPwaInstallCapture } from './pwa/pwaInstallManager'
import { initNative } from './platform/native'
import './index.css'

initPwaInstallCapture()
// Native (Capacitor) bootstrap — no-op on web/PWA.
initNative()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

