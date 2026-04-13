import { Routes, Route, Navigate } from 'react-router-dom'
import { getToken } from './lib/api'
import Login from './pages/Login.jsx'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Schema from './pages/Schema.jsx'
import DataExplorer from './pages/DataExplorer.jsx'
import PendingPlaces from './pages/PendingPlaces.jsx'

function PrivateRoute({ children }) {
  if (!getToken()) {
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
        <Route path="schema" element={<Schema />} />
        <Route path="data" element={<DataExplorer />} />
        <Route path="data/:model" element={<DataExplorer />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
