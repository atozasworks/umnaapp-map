import { useTranslate } from 'atozas-traslate'
import { formatMeasureKm, formatMeasureMiles } from '../utils/measureDistance'

const MeasureDistancePanel = ({ totalMeters, pointCount, onClear, onClose }) => {
  const tTitle = useTranslate('Measure distance')
  const tHint = useTranslate('Click on the map to add to your path')
  const tDragHint = useTranslate('Drag points to adjust the path')
  const tClear = useTranslate('Clear')
  const tClose = useTranslate('Close')
  const tTotal = useTranslate('Total distance')
  const tPoint = useTranslate('point')
  const tPoints = useTranslate('points')

  const hasPath = pointCount > 0

  return (
    <div
      className="absolute z-20 left-2 right-2 sm:left-auto sm:right-auto sm:max-w-sm pointer-events-auto"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
      role="dialog"
      aria-label={tTitle}
    >
      <div className="mx-auto sm:mx-0 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden animate-fade-in">
        <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">{tTitle}</h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-snug">
              {hasPath ? tDragHint : tHint}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label={tClose}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            {tTotal}
          </p>
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-xl font-bold text-slate-900 tabular-nums">
              {formatMeasureKm(totalMeters)}
            </span>
            <span className="text-base font-semibold text-slate-600 tabular-nums">
              {formatMeasureMiles(totalMeters)}
            </span>
          </div>
          {pointCount > 0 && (
            <p className="text-[11px] text-slate-400 mt-1.5">
              {pointCount} {pointCount === 1 ? tPoint : tPoints}
            </p>
          )}
        </div>

        <div className="flex border-t border-slate-100">
          <button
            type="button"
            onClick={onClear}
            disabled={!hasPath}
            className="flex-1 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors disabled:opacity-40 disabled:pointer-events-none min-h-[48px] touch-manipulation"
          >
            {tClear}
          </button>
        </div>
      </div>
    </div>
  )
}

export default MeasureDistancePanel
