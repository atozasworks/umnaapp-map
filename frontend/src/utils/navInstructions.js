/**
 * Turn natural-language instruction builder.
 *
 * Converts OSRM-style maneuvers (`step.maneuver.{type,modifier}` + `step.name`)
 * into short, human instructions for both on-screen banners and spoken prompts.
 * Kept dependency-free and string-based so the spoken text and the visible text
 * stay in sync.
 */

const MODIFIER_PHRASES = {
  left: 'left',
  right: 'right',
  'slight left': 'slightly left',
  'slight right': 'slightly right',
  'sharp left': 'sharp left',
  'sharp right': 'sharp right',
  straight: 'straight ahead',
  uturn: 'a U-turn',
}

const COMPASS = [
  'north',
  'northeast',
  'east',
  'southeast',
  'south',
  'southwest',
  'west',
  'northwest',
]

function compassFromBearing(bearing) {
  if (bearing == null || Number.isNaN(bearing)) return ''
  const idx = Math.round((bearing % 360) / 45) % 8
  return COMPASS[idx]
}

/** "MG Road" → " onto MG Road"; empty road name yields "". */
function onto(name) {
  return name ? ` onto ${name}` : ''
}

function on(name) {
  return name ? ` on ${name}` : ''
}

function modifierWord(modifier) {
  if (!modifier) return ''
  return MODIFIER_PHRASES[modifier] || modifier.replace(/-/g, ' ')
}

function ordinal(n) {
  const v = Number(n)
  if (!v || v < 1) return ''
  const words = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th']
  return words[v - 1] || `${v}th`
}

/**
 * Core instruction text for a maneuver, e.g. "Turn right onto MG Road".
 *
 * @param {object} step       OSRM step (has `name`, `maneuver`)
 * @returns {string}
 */
export function buildManeuverText(step) {
  if (!step) return ''
  const maneuver = step.maneuver || {}
  const type = (maneuver.type || '').toLowerCase()
  const modifier = (maneuver.modifier || '').toLowerCase()
  const road = step.name || step.destinations || ''
  const mod = modifierWord(modifier)

  switch (type) {
    case 'depart': {
      const heading = compassFromBearing(maneuver.bearing_after)
      return `Head ${heading || 'out'}${on(road)}`
    }
    case 'turn':
      if (modifier === 'straight') return `Continue straight${onto(road)}`
      if (modifier === 'uturn') return `Make a U-turn${onto(road)}`
      return `Turn ${mod}${onto(road)}`
    case 'new name':
      return `Continue${onto(road)}`
    case 'continue':
      if (modifier === 'uturn') return `Make a U-turn${onto(road)}`
      if (mod && modifier !== 'straight') return `Keep ${mod}${onto(road)}`
      return `Continue${onto(road)}`
    case 'merge':
      return `Merge ${mod || 'ahead'}${onto(road)}`
    case 'on ramp':
      return `Take the ramp${mod ? ` on the ${mod}` : ''}${onto(road)}`
    case 'off ramp':
      return `Take the exit${mod ? ` on the ${mod}` : ''}${onto(road)}`
    case 'fork':
      return `Keep ${mod || 'ahead'}${onto(road)}`
    case 'end of road':
      return `Turn ${mod || 'ahead'}${onto(road)}`
    case 'roundabout':
    case 'rotary': {
      const exit = ordinal(maneuver.exit)
      if (exit) return `At the roundabout, take the ${exit} exit${onto(road)}`
      return `Enter the roundabout${onto(road)}`
    }
    case 'roundabout turn':
      return `At the roundabout, turn ${mod}${onto(road)}`
    case 'exit roundabout':
    case 'exit rotary':
      return `Exit the roundabout${onto(road)}`
    case 'arrive': {
      const side = modifier === 'left' || modifier === 'right' ? ` on the ${modifier}` : ''
      return `Arrive at your destination${side}`
    }
    case 'notification':
      return `Continue${onto(road)}`
    default:
      if (mod) return `Turn ${mod}${onto(road)}`
      return `Continue${onto(road)}`
  }
}

/** Short label for compact UI ("Turn right", without the road name). */
export function buildManeuverShort(step) {
  if (!step) return ''
  const maneuver = step.maneuver || {}
  const type = (maneuver.type || '').toLowerCase()
  const modifier = (maneuver.modifier || '').toLowerCase()
  const mod = modifierWord(modifier)
  if (type === 'arrive') return 'Arrive'
  if (type === 'depart') return 'Start'
  if (type === 'roundabout' || type === 'rotary') {
    const exit = ordinal(maneuver.exit)
    return exit ? `Roundabout · ${exit} exit` : 'Roundabout'
  }
  if (modifier === 'uturn') return 'U-turn'
  if (type === 'turn' || type === 'end of road') return `Turn ${mod}`
  if (type === 'merge') return `Merge ${mod}`.trim()
  if (type === 'fork' || type === 'continue') return mod ? `Keep ${mod}` : 'Continue'
  return mod ? `Turn ${mod}` : 'Continue'
}

/** A coarse maneuver category used to pick the on-screen direction icon. */
export function maneuverIconKey(step) {
  if (!step) return 'straight'
  const maneuver = step.maneuver || {}
  const type = (maneuver.type || '').toLowerCase()
  const modifier = (maneuver.modifier || '').toLowerCase()
  if (type === 'arrive') return 'arrive'
  if (type === 'depart') return 'depart'
  if (type === 'roundabout' || type === 'rotary' || type === 'roundabout turn')
    return 'roundabout'
  if (modifier.includes('uturn')) return 'uturn'
  if (modifier.includes('slight left')) return 'slight-left'
  if (modifier.includes('slight right')) return 'slight-right'
  if (modifier.includes('sharp left')) return 'sharp-left'
  if (modifier.includes('sharp right')) return 'sharp-right'
  if (modifier.includes('left')) return 'left'
  if (modifier.includes('right')) return 'right'
  if (type === 'merge') return 'merge'
  if (type === 'fork') return 'fork'
  return 'straight'
}

/** Spoken distance phrasing, e.g. "300 meters", "1.2 kilometers". */
export function spokenDistance(meters) {
  if (!Number.isFinite(meters) || meters <= 0) return ''
  if (meters < 1000) {
    const rounded =
      meters > 100 ? Math.round(meters / 50) * 50 : Math.max(10, Math.round(meters / 10) * 10)
    return `${rounded} meters`
  }
  const km = meters / 1000
  const value = km < 10 ? Math.round(km * 10) / 10 : Math.round(km)
  return `${value} ${value === 1 ? 'kilometer' : 'kilometers'}`
}

/** Compact distance for the banner, e.g. "300 m", "1.2 km". */
export function shortDistance(meters) {
  if (!Number.isFinite(meters) || meters <= 0) return '0 m'
  if (meters < 1000) {
    const rounded =
      meters > 100 ? Math.round(meters / 50) * 50 : Math.max(5, Math.round(meters / 5) * 5)
    return `${rounded} m`
  }
  const km = meters / 1000
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`
}

/**
 * Build a spoken announcement for an upcoming maneuver.
 *
 * @param {object} step        the maneuver step being announced
 * @param {number} distance    meters to the maneuver (0/undefined => imminent)
 * @param {boolean} immediate  true to drop the distance prefix ("Turn right now")
 */
export function buildAnnouncement(step, distance, immediate = false) {
  const text = buildManeuverText(step)
  const type = (step?.maneuver?.type || '').toLowerCase()
  if (type === 'arrive') {
    return immediate ? `${text}.` : `In ${spokenDistance(distance)}, ${lowerFirst(text)}.`
  }
  if (immediate || !distance) {
    return `${text}.`
  }
  return `In ${spokenDistance(distance)}, ${lowerFirst(text)}.`
}

function lowerFirst(str) {
  if (!str) return str
  return str.charAt(0).toLowerCase() + str.slice(1)
}
