/**
 * Rule-based matching for the open-data auto-add job.
 *
 * Decides, for a catalogue place and a place already on the map, whether they
 * are clearly the same, clearly different, or ambiguous. Only the ambiguous
 * pairs are sent to the AI (services/placeDuplicateAi.js), so the AI bill stays
 * small. Also decides whether a new place is added directly or held for review.
 *
 * Pure functions — no database or network.
 */

/** Pairs further apart than this are never the same place. */
export const MATCH_RADIUS_M = 250
/** Roughly the app's coordinate duplicate tolerance (COORD_EPS = 0.0001°). */
export const SAME_SPOT_M = 12

const HONORIFICS = new Set(['sri', 'shri', 'shree', 'sree', 'shre', 'the'])

export function distanceMeters(aLat, aLng, bLat, bLng) {
  const dLat = (bLat - aLat) * 111320
  const dLng = (bLng - aLng) * 111320 * Math.cos(((aLat + bLat) / 2) * (Math.PI / 180))
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

/**
 * Spelling-insensitive key for one word, tuned for Indian names written in
 * Latin letters ("Shree"/"Sri", "Laxmi"/"Lakshmi", "Bakers"/"Baker").
 */
function tokenKey(word) {
  let w = word
  if (w.length > 4 && w.endsWith('s')) w = w.slice(0, -1)
  return w
    .replace(/ksh|x/g, 'ks')
    .replace(/sh/g, 's')
    .replace(/th/g, 't')
    .replace(/dh/g, 'd')
    .replace(/bh/g, 'b')
    .replace(/w/g, 'v')
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/(.)\1+/g, '$1')
}

/**
 * Words that say what kind of place it is, not which one. Two names that share
 * only these ("Ganesh Electronics" / "Prakash Electronics") are different places.
 */
const GENERIC_WORDS = new Set(
  `store shop mart bazaar electronics electricals appliances medical medicals pharmacy clinic hospital
   bakery sweets hotel restaurant cafe canteen lodge residency temple devasthana kshethra masjid mosque church
   school college vidyalaya high higher primary upper lower secondary public english medium government govt
   bank atm finance bus stop stand station post office branch centre center complex building hall
   enterprises traders trading agencies agency services service works motors textiles communication`
    .split(/\s+/)
    .filter(Boolean)
    .map(tokenKey)
)

export function nameTokens(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t && !HONORIFICS.has(t) && t !== 'and')
    .map(tokenKey)
    .filter(Boolean)
}

function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

/** 0 (nothing in common) … 1 (same name). */
export function nameSimilarity(a, b) {
  const ta = nameTokens(a)
  const tb = nameTokens(b)
  if (!ta.length || !tb.length) return 0
  const sa = ta.join(' ')
  const sb = tb.join(' ')
  if (sa === sb) return 1

  const setB = new Set(tb)
  const shared = new Set(ta.filter((t) => setB.has(t))).size
  const dice = (2 * shared) / (new Set(ta).size + setB.size)
  const edit = 1 - levenshtein(sa, sb) / Math.max(sa.length, sb.length)
  // "Durga Bakery" inside "Durga Bakery and Sweets": likely the same, but not certain.
  const shorter = Math.min(new Set(ta).size, setB.size)
  const contained = shorter >= 2 && shared === shorter ? 0.85 : 0
  const score = Math.max(dice, edit, contained)

  // No distinctive word in common → not the same place, however many generic words match.
  const da = ta.filter((t) => !GENERIC_WORDS.has(t))
  const db = tb.filter((t) => !GENERIC_WORDS.has(t))
  if (da.length && db.length) {
    const close = (x, y) => x === y || (x.length >= 5 && y.length >= 5 && levenshtein(x, y) <= 1)
    if (!da.some((x) => db.some((y) => close(x, y)))) return Math.min(score, 0.4)
  }
  return score
}

/**
 * @param {{name:string, category?:string, lat:number, lng:number}} candidate
 * @param {{name:string, altName?:string|null, category?:string, lat:number, lng:number}} existing
 * @returns {{verdict:'same'|'different'|'ambiguous', similarity:number, distance:number}}
 */
export function classifyPair(candidate, existing) {
  const distance = distanceMeters(candidate.lat, candidate.lng, existing.lat, existing.lng)
  if (distance > MATCH_RADIUS_M) return { verdict: 'different', similarity: 0, distance }

  const similarity = Math.max(
    nameSimilarity(candidate.name, existing.name),
    existing.altName ? nameSimilarity(candidate.name, existing.altName) : 0
  )

  let verdict = 'different'
  if (similarity >= 0.92) verdict = 'same'
  else if (similarity >= 0.8 && distance <= 60) verdict = 'same'
  else if (similarity >= 0.6) verdict = 'ambiguous'
  // Same spot: open data often puts a whole street on one point, so a weaker name match is worth a look.
  else if (distance <= SAME_SPOT_M && similarity >= 0.45) verdict = 'ambiguous'

  // "Indian Overseas Bank" and "Indian Overseas Bank - ATM" are two things on the map.
  const known = (c) => c && c !== 'Other'
  if (verdict === 'same' && similarity < 1 && known(candidate.category) && known(existing.category) &&
      candidate.category !== existing.category) {
    verdict = 'ambiguous'
  }

  return { verdict, similarity, distance }
}

/**
 * Quality threshold: add directly, hold for admin review, or skip.
 * @param {{name:string, category:string, confidence:number|null, source:string}} place
 * @param {{approveConfidence?:number, minConfidence?:number, trustedSources?:string[]}} options
 * @returns {{action:'approve'|'review'|'skip', reason:string}}
 */
export function decideRoute(place, { approveConfidence = 0.85, minConfidence = 0.5, trustedSources = [] } = {}) {
  const name = String(place.name || '').trim()
  if (name.length < 3 || (name.match(/\p{L}/gu) || []).length < 2) return { action: 'skip', reason: 'name is not usable' }

  const confidence = place.confidence == null ? null : Number(place.confidence)
  const trusted = trustedSources.includes(place.source)

  if (confidence != null && confidence < minConfidence) {
    return { action: 'skip', reason: `confidence ${confidence.toFixed(2)} below ${minConfidence}` }
  }
  if (!/[a-z]{2}/i.test(name)) {
    return { action: 'review', reason: 'name is only in local script (English name needed)' }
  }
  if (!place.category || place.category === 'Other') {
    return { action: 'review', reason: 'category could not be mapped' }
  }
  if (confidence == null) {
    return trusted
      ? { action: 'approve', reason: `trusted source ${place.source}` }
      : { action: 'review', reason: 'source gives no confidence score' }
  }
  if (confidence >= approveConfidence) {
    return { action: 'approve', reason: `confidence ${confidence.toFixed(2)}` }
  }
  return { action: 'review', reason: `confidence ${confidence.toFixed(2)} below ${approveConfidence}` }
}
