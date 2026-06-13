/**
 * Festival / jatre overlay logic.
 *
 * A festival place carries a date window (festivalStartDate / festivalEndDate)
 * and a recurrence rule ('yearly' | 'none'). These markers are only shown on
 * the map during their active window; an "Upcoming festivals" view surfaces the
 * next occurrence with a countdown.
 */

export const FESTIVAL_CATEGORY = 'Festival'
const DAY_MS = 24 * 60 * 60 * 1000

function toDate(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
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

/** Is this place a festival/jatre marker (by category or by having a window)? */
export function isFestivalPlace(place) {
  if (!place) return false
  if (place.category === FESTIVAL_CATEGORY) return true
  return Boolean(place.festivalStartDate ?? place.festival_start_date)
}

/**
 * Resolve the festival occurrence relevant to `now`.
 * For one-off festivals this is just the stored window. For yearly festivals we
 * project the stored month/day onto the current year, rolling to next year once
 * the current year's window has already ended.
 */
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
  if (occ.end.getTime() < now.getTime()) {
    occ = buildFor(year + 1)
  }
  return occ
}

/** Full status object: next occurrence window, active flag, day countdowns. */
export function festivalStatus(place, now = new Date()) {
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

/**
 * Whether a festival marker should be visible on the map right now.
 * Visible while active, or within `previewDays` before the next occurrence.
 * Non-festival places are always visible.
 */
export function isFestivalVisibleNow(place, now = new Date(), { previewDays = 0 } = {}) {
  if (!isFestivalPlace(place)) return true
  const status = festivalStatus(place, now)
  if (!status) return true // missing dates → don't hide (treat as normal place)
  if (status.active) return true
  if (previewDays > 0 && status.daysUntilStart <= previewDays) return true
  return false
}

/**
 * Parse incoming request fields into normalized festival DB values.
 * Only keys actually present in the payload are emitted, so unrelated updates
 * (e.g. an admin edit that never touches festival data) never wipe stored dates.
 */
export function buildFestivalFields(item = {}) {
  const fields = {}
  if (!item || typeof item !== 'object') return fields

  const has = (...keys) => keys.some((k) => Object.prototype.hasOwnProperty.call(item, k))
  const pick = (...keys) => {
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(item, k)) return item[k]
    }
    return undefined
  }

  if (has('festivalStartDate', 'festival_start_date', 'festivalStart', 'festival_start')) {
    fields.festivalStartDate = toDate(
      pick('festivalStartDate', 'festival_start_date', 'festivalStart', 'festival_start')
    )
  }
  if (has('festivalEndDate', 'festival_end_date', 'festivalEnd', 'festival_end')) {
    fields.festivalEndDate = toDate(
      pick('festivalEndDate', 'festival_end_date', 'festivalEnd', 'festival_end')
    )
  }
  if (has('festivalRecurrence', 'festival_recurrence')) {
    const raw = pick('festivalRecurrence', 'festival_recurrence')
    fields.festivalRecurrence = raw === 'yearly' ? 'yearly' : raw === 'none' ? 'none' : null
  }
  return fields
}
