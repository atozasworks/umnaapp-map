/**
 * Festival / jatre overlay helpers (client side).
 *
 * Festival places carry a date window (festivalStartDate / festivalEndDate) and
 * a recurrence rule ('yearly' | 'none'). They only appear on the map during their
 * active window; the Upcoming Festivals panel surfaces the next occurrence with a
 * countdown. Logic mirrors backend/utils/festival.js.
 */

export const FESTIVAL_CATEGORY = 'Festival'
export const FESTIVAL_ICON = '🎪'
const DAY_MS = 24 * 60 * 60 * 1000

function toDate(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function isFestivalPlace(place) {
  if (!place) return false
  if (place.category === FESTIVAL_CATEGORY) return true
  return Boolean(place.festivalStartDate ?? place.festival_start_date)
}

export function getFestivalStart(place) {
  return toDate(place?.festivalStartDate ?? place?.festival_start_date)
}

export function getFestivalEnd(place) {
  return toDate(place?.festivalEndDate ?? place?.festival_end_date) || getFestivalStart(place)
}

export function getFestivalRecurrence(place) {
  const r = place?.festivalRecurrence ?? place?.festival_recurrence
  return r === 'yearly' ? 'yearly' : 'none'
}

export function festivalOccurrence(place, now = new Date()) {
  const start = getFestivalStart(place)
  if (!start) return null
  const end = getFestivalEnd(place) || start
  const recurrence = getFestivalRecurrence(place)

  if (recurrence !== 'yearly') {
    return { start, end }
  }

  const durationMs = Math.max(0, end.getTime() - start.getTime())
  const buildFor = (year) => {
    const s = new Date(start)
    s.setFullYear(year)
    return { start: s, end: new Date(s.getTime() + durationMs) }
  }

  const year = now.getFullYear()
  let occ = buildFor(year)
  if (occ.end.getTime() < now.getTime()) occ = buildFor(year + 1)
  return occ
}

/**
 * Status object. Prefers a server-computed `place.festival` payload when present
 * (keeps client/server clocks consistent), otherwise computes locally.
 */
export function festivalStatus(place, now = new Date()) {
  if (place?.festival && place.festival.startISO) {
    const start = toDate(place.festival.startISO)
    const end = toDate(place.festival.endISO) || start
    if (start) {
      const t = now.getTime()
      const active = t >= start.getTime() && t <= end.getTime()
      return {
        start,
        end,
        startISO: start.toISOString(),
        endISO: end.toISOString(),
        active,
        daysUntilStart: active ? 0 : Math.ceil((start.getTime() - t) / DAY_MS),
        daysUntilEnd: Math.ceil((end.getTime() - t) / DAY_MS),
        recurrence: place.festival.recurrence || getFestivalRecurrence(place),
      }
    }
  }

  const occ = festivalOccurrence(place, now)
  if (!occ) return null
  const t = now.getTime()
  const active = t >= occ.start.getTime() && t <= occ.end.getTime()
  return {
    start: occ.start,
    end: occ.end,
    startISO: occ.start.toISOString(),
    endISO: occ.end.toISOString(),
    active,
    daysUntilStart: active ? 0 : Math.ceil((occ.start.getTime() - t) / DAY_MS),
    daysUntilEnd: Math.ceil((occ.end.getTime() - t) / DAY_MS),
    recurrence: getFestivalRecurrence(place),
  }
}

export function isFestivalVisibleNow(place, now = new Date(), { previewDays = 0 } = {}) {
  if (!isFestivalPlace(place)) return true
  const status = festivalStatus(place, now)
  if (!status) return true
  if (status.active) return true
  if (previewDays > 0 && status.daysUntilStart <= previewDays) return true
  return false
}

/** Short human countdown label, e.g. "Happening now", "in 3 days", "Tomorrow". */
export function festivalCountdownLabel(status) {
  if (!status) return ''
  if (status.active) {
    if (status.daysUntilEnd <= 0) return 'Last day'
    if (status.daysUntilEnd === 1) return 'Ends tomorrow'
    return `Happening now · ${status.daysUntilEnd} days left`
  }
  const d = status.daysUntilStart
  if (d <= 0) return 'Starting today'
  if (d === 1) return 'Tomorrow'
  if (d < 30) return `in ${d} days`
  if (d < 60) return 'in about a month'
  const months = Math.round(d / 30)
  return `in about ${months} months`
}

const DATE_FMT = { day: 'numeric', month: 'short', year: 'numeric' }

/** Readable window, e.g. "12 Apr 2026 – 16 Apr 2026" or single day. */
export function formatFestivalWindow(status) {
  if (!status) return ''
  const start = status.start instanceof Date ? status.start : toDate(status.startISO)
  const end = status.end instanceof Date ? status.end : toDate(status.endISO)
  if (!start) return ''
  const startStr = start.toLocaleDateString(undefined, DATE_FMT)
  if (!end || end.toDateString() === start.toDateString()) return startStr
  return `${startStr} – ${end.toLocaleDateString(undefined, DATE_FMT)}`
}
