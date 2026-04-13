import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-800">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="tabular-nums text-slate-600">
          <span className="font-medium" style={{ color: p.color }}>
            {p.name}
          </span>
          : {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

export default function OverviewGrowthChart({ rows, errors, className = '' }) {
  const data = Array.isArray(rows) && rows.length > 0 ? rows : []
  const hasErr = errors && Object.keys(errors).length > 0

  return (
    <div
      className={`flex h-full min-h-[280px] flex-col rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm ${className}`}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Growth summary</h3>
          <p className="text-[11px] text-slate-500">New records by month (database)</p>
        </div>
      </div>

      {hasErr && (
        <p className="mb-2 text-[10px] text-amber-700">
          Partial data: {Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join(' · ')}
        </p>
      )}

      {data.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-xs text-slate-500">No monthly data yet.</div>
      ) : (
        <div className="min-h-[220px] flex-1 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="overviewFillUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="overviewFillPlaces" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={36} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8, color: '#475569' }} iconType="circle" />
              <Area
                type="monotone"
                dataKey="Users"
                name="Users"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#overviewFillUsers)"
                activeDot={{ r: 4 }}
              />
              <Area
                type="monotone"
                dataKey="Places"
                name="Places"
                stroke="#16a34a"
                strokeWidth={2}
                fill="url(#overviewFillPlaces)"
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
