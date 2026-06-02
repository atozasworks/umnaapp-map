/**
 * Google Maps–style bold prefix match for place autocomplete rows.
 */

export function splitPlaceSuggestion(result) {
  const full = String(result?.displayName || result?.name || '').trim()
  if (!full) return { primary: '', secondary: '' }

  const commaIdx = full.indexOf(',')
  const primary = commaIdx >= 0 ? full.slice(0, commaIdx).trim() : full
  const fromName = commaIdx >= 0 ? full.slice(commaIdx + 1).trim() : ''

  const addr = result?.address
  const addrLine =
    addr && typeof addr === 'object'
      ? [addr.state, addr.county || addr.state_district, addr.country].filter(Boolean).join(', ')
      : ''

  const secondary = fromName || addrLine
  return { primary, secondary }
}

/**
 * @returns {Array<{ text: string, bold: boolean, muted?: boolean }>}
 */
export function highlightQuerySegments(text, query) {
  const source = String(text || '')
  const q = String(query || '').trim()
  if (!source || !q || q.length < 1) {
    return [{ text: source, bold: false }]
  }

  const lower = source.toLowerCase()
  const qLower = q.toLowerCase()
  const idx = lower.indexOf(qLower)
  if (idx === -1) {
    return [{ text: source, bold: false }]
  }

  const segments = []
  if (idx > 0) segments.push({ text: source.slice(0, idx), bold: false })
  segments.push({ text: source.slice(idx, idx + q.length), bold: true })
  const after = source.slice(idx + q.length)
  if (after) segments.push({ text: after, bold: false, muted: true })
  return segments
}
