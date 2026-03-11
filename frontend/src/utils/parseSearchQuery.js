/**
 * Parse URL/path and extract "q" query param (equivalent to Python urllib.parse).
 * If user pastes "https://example.com/search?q=kadaba" or "?q=kadaba", extracts "kadaba".
 * Preserves spaces in typed input (place district state) - only trimStart to remove leading whitespace.
 * @param {string} input - Raw input (plain text or URL with ?q=)
 * @returns {string} - Extracted query or original input (spaces preserved)
 */
export function parseQueryFromInput(input) {
  if (!input || typeof input !== 'string') return input || ''
  const s = input.trimStart() // Keep trailing space so "Kadaba " then "Kadaba B" works
  if (!s) return ''
  try {
    const url = s.startsWith('http')
      ? new URL(s)
      : new URL('https://x' + (s.startsWith('?') ? s : '/' + s))
    const q = url.searchParams.get('q')
    return q ? q.trim() : s
  } catch {
    return s
  }
}
