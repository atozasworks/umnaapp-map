import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'

function VehicleRow({ v, onEdit, onDelete, onTrack }) {
  const last = v.locations && v.locations[0]
  return (
    <div className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{v.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{v.type} · {v.licensePlate || '—'}</p>
        {last && (
          <p className="text-[11px] text-slate-400 mt-1">Last: {new Date(last.timestamp).toLocaleString()}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onTrack(v)} className="px-3 py-2 rounded-lg bg-sky-500 text-white text-sm">Track</button>
        <button type="button" onClick={() => onEdit(v)} className="px-3 py-2 rounded-lg border text-sm">Edit</button>
        <button type="button" onClick={() => onDelete(v)} className="px-3 py-2 rounded-lg text-rose-600 text-sm">Delete</button>
      </div>
    </div>
  )
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'car', licensePlate: '' })
  const [editing, setEditing] = useState(null)
  const { socket } = useSocket()
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.get('/vehicles')
      .then(({ data }) => { if (!cancelled) setVehicles(data.vehicles || []) })
      .catch((e) => { if (!cancelled) setError(e.response?.data?.error || e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const refresh = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/vehicles')
      setVehicles(data.vehicles || [])
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const { data } = await api.put(`/vehicles/${editing.id}`, form)
        setVehicles((s) => s.map((sv) => (sv.id === editing.id ? data.vehicle : sv)))
        setEditing(null)
      } else {
        const { data } = await api.post('/vehicles', form)
        setVehicles((s) => [data.vehicle, ...s])
      }
      setForm({ name: '', type: 'car', licensePlate: '' })
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    }
  }

  const handleEdit = (v) => {
    setEditing(v)
    setForm({ name: v.name || '', type: v.type || 'car', licensePlate: v.licensePlate || '' })
  }

  const handleDelete = async (v) => {
    if (!window.confirm(`Delete vehicle "${v.name}"?`)) return
    try {
      await api.delete(`/vehicles/${v.id}`)
      setVehicles((s) => s.filter((x) => x.id !== v.id))
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    }
  }

  const handleTrack = (v) => {
    if (!socket) return alert('Socket not connected')
    socket.emit('vehicle:join', { vehicleId: v.id })
    socket.emit('vehicles:list')
    // navigate to map root where MapComponent will show markers
    navigate('/')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Vehicles</h1>
        <p className="text-sm text-slate-500 mt-1">Add, edit, delete, and track your vehicles.</p>
      </header>

      <section className="space-y-4 mb-6">
        <form onSubmit={handleCreateOrUpdate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Vehicle name" className="px-3 py-2 rounded-lg border" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="px-3 py-2 rounded-lg border">
            <option value="car">Car</option>
            <option value="truck">Truck</option>
            <option value="bike">Bike</option>
            <option value="motorcycle">Motorcycle</option>
            <option value="van">Van</option>
            <option value="other">Other</option>
          </select>
          <div className="flex gap-2">
            <input value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} placeholder="License plate (optional)" className="flex-1 px-3 py-2 rounded-lg border" />
            <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white">{editing ? 'Save' : 'Add'}</button>
          </div>
        </form>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </section>

      <section className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : vehicles.length === 0 ? (
          <p className="text-sm text-slate-500">No vehicles yet. Add one above.</p>
        ) : (
          vehicles.map((v) => (
            <VehicleRow key={v.id} v={v} onEdit={handleEdit} onDelete={handleDelete} onTrack={handleTrack} />
          ))
        )}
      </section>
    </div>
  )
}
