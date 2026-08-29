import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { checkAdminSession } from './lib/api'
import Login from './pages/Login.jsx'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Schema from './pages/Schema.jsx'
import DataExplorer from './pages/DataExplorer.jsx'
import PendingPlaces from './pages/PendingPlaces.jsx'
import ExtractedPlaces from './pages/ExtractedPlaces.jsx'
import BusinessClaims from './pages/BusinessClaims.jsx'
import LegalDocs from './pages/LegalDocs.jsx'
import SafetyHazards from './pages/SafetyHazards.jsx'
import AdminSettings from './pages/AdminSettings.jsx'

function PrivateRoute({ children }) {
  const [state, setState] = useState('loading') // loading | ok | no

  useEffect(() => {
    let cancelled = false
    checkAdminSession().then((ok) => {
      if (!cancelled) setState(ok ? 'ok' : 'no')
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-admin-950 text-sm text-admin-muted">
        Checking session…
      </div>
    )
  }
  if (state === 'no') {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="pending-places" element={<PendingPlaces />} />
        <Route path="safety-hazards" element={<SafetyHazards />} />
        <Route path="business-claims" element={<BusinessClaims />} />
        <Route path="legal" element={<LegalDocs />} />
        <Route path="extracted-places" element={<ExtractedPlaces />} />
        <Route path="schema" element={<Schema />} />
        <Route path="data" element={<DataExplorer />} />
        <Route path="data/:model" element={<DataExplorer />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
