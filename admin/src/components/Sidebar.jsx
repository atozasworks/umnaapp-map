import { NavLink, useNavigate } from 'react-router-dom'
import { setToken } from '../lib/api'

const links = [
  { to: '/', label: 'Overview', icon: MOverview },
  { to: '/pending-places', label: 'Pending approval', icon: MHourglass },
  { to: '/schema', label: 'Database schema', icon: MSchema },
  { to: '/data', label: 'Browse data', icon: MTable },
]

export default function Sidebar() {
  const navigate = useNavigate()

  function logout() {
    setToken('')
    navigate('/login', { replace: true })
  }

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-admin-border bg-admin-900/80 backdrop-blur-md">
      <div className="border-b border-admin-border p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/20 to-cyan-500/10 ring-1 ring-admin-accent/30">
            <span className="text-lg font-bold text-admin-accent">U</span>
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">UMNAAPP</p>
            <p className="text-xs text-admin-muted">Control center</p>
          </div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-admin-accent/15 text-admin-accent ring-1 ring-admin-accent/25'
                  : 'text-admin-muted hover:bg-admin-850 hover:text-slate-200',
              ].join(' ')
            }
          >
            <Icon className="h-5 w-5 shrink-0 opacity-80" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-admin-border p-3">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-admin-muted transition-colors hover:bg-red-500/10 hover:text-red-300"
        >
          <MLogout className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}

function MHourglass({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function MOverview({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75a2.25 2.25 0 012.25-2.25h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25z"
      />
    </svg>
  )
}

function MSchema({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
      />
    </svg>
  )
}

function MTable({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125V4.875m0 13.5v-13.5a1.125 1.125 0 011.125-1.125h17.25m-17.25 0h17.25m0 0v13.5a1.125 1.125 0 01-1.125 1.125M3.375 4.875h17.25M9.75 8.625h4.5m-4.5 3.75h4.5m-4.5 3.75h4.5m4.5-11.25v11.25"
      />
    </svg>
  )
}

function MLogout({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M18 12H9m9 0l-3-3m3 3l-3 3"
      />
    </svg>
  )
}
