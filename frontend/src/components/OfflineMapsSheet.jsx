import { useCallback, useEffect, useState } from 'react'
import { useTranslate } from '../lib/i18n'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import {
  QUALITY_PRESETS,
  clampBoundsForDownload,
  estimateStorageBytes,
  estimateTileCount,
  formatBytes,
  listRegions,
  deleteOfflineRegion,
  renameOfflineRegion,
  updateOfflineRegion,
  offlineDownloadManager,
  refreshOfflinePacksFlag,
  sumOfflineStorageBytes,
  getStorageEstimate,
} from '../utils/offlineMaps'

const QUALITY_IDS = ['low', 'medium', 'high']

/**
 * Offline Maps manager + download sheet (mirrors PublicUtilityFinderSheet layout).
 */
export default function OfflineMapsSheet({ isOpen, onClose, mapRef, onRegionsChange }) {
  const isOnline = useOnlineStatus()
  const tTitle = useTranslate('Offline Maps')
  const tSubtitle = useTranslate('Download map areas to use without internet')
  const tClose = useTranslate('Close')
  const tDownload = useTranslate('Download current area')
  const tQuality = useTranslate('Download quality')
  const tEstimate = useTranslate('Estimated size')
  const tManager = useTranslate('Downloaded maps')
  const tStorage = useTranslate('Storage used')
  const tRename = useTranslate('Rename')
  const tDelete = useTranslate('Delete')
  const tUpdate = useTranslate('Update')
  const tPause = useTranslate('Pause')
  const tResume = useTranslate('Resume')
  const tCancel = useTranslate('Cancel')
  const tEmpty = useTranslate('No offline maps yet. Pan the map to an area and download it.')
  const tNeedOnline = useTranslate('Connect to the internet to download maps.')
  const tOfflineHint = useTranslate('You are offline. Downloaded maps will load automatically when available.')

  const [regions, setRegions] = useState([])
  const [storageUsed, setStorageUsed] = useState(0)
  const [quotaInfo, setQuotaInfo] = useState({ available: 0, quota: 0 })
  const [qualityId, setQualityId] = useState('medium')
  const [estimateBytes, setEstimateBytes] = useState(0)
  const [estimateTiles, setEstimateTiles] = useState(0)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const refreshList = useCallback(async () => {
    try {
      const [list, used, storage] = await Promise.all([
        listRegions(),
        sumOfflineStorageBytes(),
        getStorageEstimate(),
      ])
      setRegions(list)
      setStorageUsed(used)
      setQuotaInfo(storage)
      await refreshOfflinePacksFlag()
      onRegionsChange?.(list)
    } catch (err) {
      setError(err?.message || 'Could not load offline maps')
    }
  }, [onRegionsChange])

  const refreshEstimate = useCallback(() => {
    try {
      const map = mapRef?.current?.getMap?.()
      if (!map) {
        setEstimateBytes(0)
        setEstimateTiles(0)
        return
      }
      const b = map.getBounds()
      const bounds = {
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      }
      const clamped = clampBoundsForDownload(bounds)
      setEstimateTiles(estimateTileCount(clamped, qualityId))
      setEstimateBytes(estimateStorageBytes(clamped, qualityId))
    } catch {
      setEstimateBytes(0)
      setEstimateTiles(0)
    }
  }, [mapRef, qualityId])

  useEffect(() => {
    if (!isOpen) return undefined
    refreshList()
    refreshEstimate()
    const unsub = offlineDownloadManager.subscribe((snap) => {
      setProgress(snap)
      if (snap.status === 'ready' || snap.status === 'cancelled' || snap.status === 'error') {
        refreshList()
        if (snap.status === 'ready' || snap.status === 'cancelled') {
          setBusy(false)
        }
      }
    })
    const active = offlineDownloadManager.getActive()
    if (active) {
      setProgress({
        regionId: active.regionId,
        status: active.status,
        completed: active.completed,
        total: active.total,
        bytesUsed: active.bytesUsed,
        progress: active.total ? active.completed / active.total : 0,
      })
      setBusy(active.status === 'downloading' || active.status === 'paused')
    }
    return () => unsub()
  }, [isOpen, refreshList, refreshEstimate])

  useEffect(() => {
    if (!isOpen) return
    refreshEstimate()
  }, [isOpen, qualityId, refreshEstimate])

  const getCurrentBounds = () => {
    const map = mapRef?.current?.getMap?.()
    if (!map) throw new Error('Map is not ready')
    const b = map.getBounds()
    return {
      west: b.getWest(),
      south: b.getSouth(),
      east: b.getEast(),
      north: b.getNorth(),
    }
  }

  const handleDownload = async () => {
    setError(null)
    if (!isOnline) {
      setError(tNeedOnline)
      return
    }
    setBusy(true)
    try {
      const bounds = getCurrentBounds()
      await offlineDownloadManager.start({
        bounds,
        qualityId,
        onProgress: setProgress,
      })
      await refreshList()
    } catch (err) {
      setError(err?.message || 'Download failed')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const handleRename = async (id) => {
    setError(null)
    try {
      await renameOfflineRegion(id, editName)
      setEditingId(null)
      setEditName('')
      await refreshList()
    } catch (err) {
      setError(err?.message || 'Rename failed')
    }
  }

  const handleDelete = async (id) => {
    setError(null)
    try {
      await deleteOfflineRegion(id)
      setConfirmDeleteId(null)
      await refreshList()
    } catch (err) {
      setError(err?.message || 'Delete failed')
    }
  }

  const handleUpdate = async (region) => {
    setError(null)
    if (!isOnline) {
      setError(tNeedOnline)
      return
    }
    setBusy(true)
    try {
      await updateOfflineRegion(region.id, {
        bounds: region.bounds,
        qualityId: region.quality,
      })
      await refreshList()
    } catch (err) {
      setError(err?.message || 'Update failed')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  if (!isOpen) return null

  const progressPct = progress ? Math.round((progress.progress || 0) * 100) : 0
  const downloading = progress && (progress.status === 'downloading' || progress.status === 'paused')

  return (
    <div
      className="fixed inset-0 z-[350] flex items-end sm:items-stretch sm:justify-start pointer-events-none"
      role="dialog"
      aria-label={tTitle}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/30 sm:bg-black/20 pointer-events-auto"
        aria-label={tClose}
        onClick={onClose}
      />

      <div
        className="relative pointer-events-auto w-full sm:w-[400px] sm:max-w-[90vw] sm:h-full sm:mt-0 max-h-[82vh] sm:max-h-none bg-white rounded-t-2xl sm:rounded-none shadow-2xl border border-slate-200/80 flex flex-col animate-sheet-up sm:animate-fade-in pb-[env(safe-area-inset-bottom)] sm:pt-[env(safe-area-inset-top)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2 border-b border-slate-100">
          <div className="min-w-0">
            <div className="mx-auto sm:hidden w-10 h-1 rounded-full bg-slate-200 mb-2" />
            <h2 className="text-base font-bold text-slate-900">{tTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-snug">{tSubtitle}</p>
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

        <div className="flex-1 min-h-0 overflow-y-auto">
          {!isOnline && (
            <div className="mx-4 mt-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5 text-xs text-amber-800">
              {tOfflineHint}
            </div>
          )}

          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">{tQuality}</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {QUALITY_IDS.map((id) => {
                const preset = QUALITY_PRESETS[id]
                const active = qualityId === id
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={busy}
                    onClick={() => setQualityId(id)}
                    className={`min-h-[40px] px-3 rounded-lg text-xs font-semibold transition-colors touch-manipulation disabled:opacity-60 ${
                      active
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span className="block">{preset.label}</span>
                    <span className={`block text-[10px] font-normal ${active ? 'text-sky-100' : 'text-slate-500'}`}>
                      z{preset.minZoom}–{preset.maxZoom}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{tEstimate}</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5">
                {formatBytes(estimateBytes)}
                <span className="text-xs font-normal text-slate-500 ml-1.5">
                  · {estimateTiles.toLocaleString()} tiles
                </span>
              </p>
              {estimateTiles > 12000 && (
                <p className="text-[11px] text-amber-700 mt-1">
                  Area may be too large — zoom in or choose Low/Medium quality.
                </p>
              )}
              {Number.isFinite(quotaInfo.available) && quotaInfo.quota > 0 && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Available on device: {formatBytes(quotaInfo.available)}
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={busy || !isOnline}
              onClick={handleDownload}
              className="w-full min-h-[44px] rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation transition-colors"
            >
              {tDownload}
            </button>
            {!isOnline && (
              <p className="text-[11px] text-slate-500 mt-2 text-center">{tNeedOnline}</p>
            )}
          </div>

          {downloading && (
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-slate-700">
                  {progress.status === 'paused' ? 'Paused' : 'Downloading…'} {progressPct}%
                </p>
                <p className="text-[11px] text-slate-500">
                  {progress.completed}/{progress.total}
                </p>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-3">
                <div
                  className="h-full bg-sky-500 transition-all duration-200"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex gap-2">
                {progress.status === 'paused' ? (
                  <button
                    type="button"
                    onClick={() => offlineDownloadManager.resume()}
                    className="flex-1 min-h-[40px] rounded-lg bg-sky-600 text-white text-xs font-semibold touch-manipulation"
                  >
                    {tResume}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => offlineDownloadManager.pause()}
                    className="flex-1 min-h-[40px] rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold touch-manipulation"
                  >
                    {tPause}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => offlineDownloadManager.cancel()}
                  className="flex-1 min-h-[40px] rounded-lg bg-red-50 text-red-700 text-xs font-semibold touch-manipulation"
                >
                  {tCancel}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mx-4 mt-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="px-4 py-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {tManager}
                {regions.length > 0 ? ` (${regions.length})` : ''}
              </p>
              <p className="text-[11px] text-slate-500">
                {tStorage}: {formatBytes(storageUsed)}
              </p>
            </div>

            {regions.length === 0 && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-6 text-center">
                <p className="text-sm text-slate-600">{tEmpty}</p>
              </div>
            )}

            <ul className="space-y-2">
              {regions.map((region) => {
                const preset = QUALITY_PRESETS[region.quality] || QUALITY_PRESETS.medium
                const isEditing = editingId === region.id
                return (
                  <li
                    key={region.id}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                  >
                    {isEditing ? (
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 min-h-[36px] rounded-lg border border-slate-200 px-2.5 text-sm"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleRename(region.id)}
                          className="px-3 rounded-lg bg-sky-600 text-white text-xs font-semibold"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null)
                            setEditName('')
                          }}
                          className="px-3 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold"
                        >
                          {tCancel}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{region.name}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {preset.label} · z{region.minZoom}–{region.maxZoom} ·{' '}
                            {formatBytes(region.bytesUsed)}
                            {region.status !== 'ready' ? ` · ${region.status}` : ''}
                          </p>
                        </div>
                      </div>
                    )}

                    {confirmDeleteId === region.id ? (
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(region.id)}
                          className="flex-1 min-h-[36px] rounded-lg bg-red-600 text-white text-[11px] font-semibold touch-manipulation"
                        >
                          Confirm delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="flex-1 min-h-[36px] rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold touch-manipulation"
                        >
                          {tCancel}
                        </button>
                      </div>
                    ) : (
                      !isEditing && (
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(region.id)
                              setEditName(region.name)
                            }}
                            className="flex-1 min-h-[36px] rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold touch-manipulation"
                          >
                            {tRename}
                          </button>
                          <button
                            type="button"
                            disabled={busy || !isOnline}
                            onClick={() => handleUpdate(region)}
                            className="flex-1 min-h-[36px] rounded-lg bg-sky-50 text-sky-700 text-[11px] font-semibold disabled:opacity-50 touch-manipulation"
                          >
                            {tUpdate}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setConfirmDeleteId(region.id)}
                            className="flex-1 min-h-[36px] rounded-lg bg-red-50 text-red-700 text-[11px] font-semibold disabled:opacity-50 touch-manipulation"
                          >
                            {tDelete}
                          </button>
                        </div>
                      )
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
