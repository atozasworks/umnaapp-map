/**
 * Localized turn-by-turn instruction builder.
 *
 * Produces maneuver text, spoken announcements and distance phrasing in the
 * app's supported navigation languages. English mirrors the original
 * `navInstructions.js` wording exactly, so existing behaviour is unchanged when
 * language is 'en' (the default).
 *
 * Road names are proper nouns and are never translated — they are interpolated
 * verbatim into each language's sentence template.
 *
 * Supported: en (English), kn (Kannada), hi (Hindi), tu (Tulu, Kannada script).
 * Tulu has no dedicated TTS voice; speech falls back to the Kannada voice
 * (see utils/speech.js) which correctly reads the shared Kannada script.
 */

export const VOICE_NAV_LANGUAGES = ['en', 'kn', 'hi', 'tu']

const FALLBACK = 'en'

/** Per-language phrase fragments + sentence assemblers. */
const PACKS = {
  en: {
    dir: {
      left: 'left',
      right: 'right',
      'slight left': 'slightly left',
      'slight right': 'slightly right',
      'sharp left': 'sharp left',
      'sharp right': 'sharp right',
      straight: 'straight ahead',
      uturn: 'a U-turn',
    },
    compass: ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'],
    onto: (road) => (road ? ` onto ${road}` : ''),
    on: (road) => (road ? ` on ${road}` : ''),
    turn: (d, road) => `Turn ${d}${road ? ` onto ${road}` : ''}`,
    continueStraight: (road) => `Continue straight${road ? ` onto ${road}` : ''}`,
    uturn: (road) => `Make a U-turn${road ? ` onto ${road}` : ''}`,
    cont: (road) => `Continue${road ? ` onto ${road}` : ''}`,
    keep: (d, road) => `Keep ${d}${road ? ` onto ${road}` : ''}`,
    merge: (d, road) => `Merge ${d || 'ahead'}${road ? ` onto ${road}` : ''}`,
    head: (c, road) => `Head ${c || 'out'}${road ? ` on ${road}` : ''}`,
    ramp: (d, road) => `Take the ramp${d ? ` on the ${d}` : ''}${road ? ` onto ${road}` : ''}`,
    offramp: (d, road) => `Take the exit${d ? ` on the ${d}` : ''}${road ? ` onto ${road}` : ''}`,
    roundabout: (ord, road) =>
      ord ? `At the roundabout, take the ${ord} exit${road ? ` onto ${road}` : ''}` : `Enter the roundabout${road ? ` onto ${road}` : ''}`,
    roundaboutTurn: (d, road) => `At the roundabout, turn ${d}${road ? ` onto ${road}` : ''}`,
    exitRoundabout: (road) => `Exit the roundabout${road ? ` onto ${road}` : ''}`,
    arrive: (side) => `Arrive at your destination${side ? ` on the ${side}` : ''}`,
    inDistance: (dist, instr) => `In ${dist}, ${lowerFirst(instr)}.`,
    sentence: (instr) => `${instr}.`,
    starting: (intro) => `Starting navigation. ${intro}`,
    rerouting: 'Rerouting.',
    arrived: 'You have arrived at your destination.',
    meters: (n) => `${n} meters`,
    km: (v) => `${v} ${v === 1 ? 'kilometer' : 'kilometers'}`,
  },

  kn: {
    dir: {
      left: 'ಎಡಕ್ಕೆ',
      right: 'ಬಲಕ್ಕೆ',
      'slight left': 'ಸ್ವಲ್ಪ ಎಡಕ್ಕೆ',
      'slight right': 'ಸ್ವಲ್ಪ ಬಲಕ್ಕೆ',
      'sharp left': 'ತೀಕ್ಷ್ಣವಾಗಿ ಎಡಕ್ಕೆ',
      'sharp right': 'ತೀಕ್ಷ್ಣವಾಗಿ ಬಲಕ್ಕೆ',
      straight: 'ನೇರವಾಗಿ',
      uturn: 'ಯು-ತಿರುವು',
    },
    compass: ['ಉತ್ತರ', 'ಈಶಾನ್ಯ', 'ಪೂರ್ವ', 'ಆಗ್ನೇಯ', 'ದಕ್ಷಿಣ', 'ನೈಋತ್ಯ', 'ಪಶ್ಚಿಮ', 'ವಾಯವ್ಯ'],
    turn: (d, road) => `${road ? `${road} ಗೆ ` : ''}${d} ತಿರುಗಿ`,
    continueStraight: (road) => `${road ? `${road} ನಲ್ಲಿ ` : ''}ನೇರವಾಗಿ ಮುಂದುವರಿಯಿರಿ`,
    uturn: (road) => `${road ? `${road} ಗೆ ` : ''}ಯು-ತಿರುವು ತೆಗೆದುಕೊಳ್ಳಿ`,
    cont: (road) => `${road ? `${road} ನಲ್ಲಿ ` : ''}ಮುಂದುವರಿಯಿರಿ`,
    keep: (d, road) => `${road ? `${road} ಗೆ ` : ''}${d} ಇರಿ`,
    merge: (d, road) => `${road ? `${road} ಗೆ ` : ''}${d || 'ಮುಂದೆ'} ವಿಲೀನಗೊಳ್ಳಿ`,
    head: (c, road) => `${road ? `${road} ನಲ್ಲಿ ` : ''}${c || 'ಮುಂದಕ್ಕೆ'} ಸಾಗಿ`,
    ramp: (d, road) => `${road ? `${road} ಗೆ ` : ''}ರ‍್ಯಾಂಪ್ ತೆಗೆದುಕೊಳ್ಳಿ${d ? ` (${d})` : ''}`,
    offramp: (d, road) => `${road ? `${road} ಗೆ ` : ''}ನಿರ್ಗಮನ ತೆಗೆದುಕೊಳ್ಳಿ${d ? ` (${d})` : ''}`,
    roundabout: (ord, road) =>
      ord ? `ವೃತ್ತದಲ್ಲಿ ${ord} ನಿರ್ಗಮನ ತೆಗೆದುಕೊಳ್ಳಿ${road ? ` (${road})` : ''}` : `ವೃತ್ತವನ್ನು ಪ್ರವೇಶಿಸಿ${road ? ` (${road})` : ''}`,
    roundaboutTurn: (d, road) => `ವೃತ್ತದಲ್ಲಿ ${d} ತಿರುಗಿ${road ? ` (${road})` : ''}`,
    exitRoundabout: (road) => `ವೃತ್ತದಿಂದ ನಿರ್ಗಮಿಸಿ${road ? ` (${road})` : ''}`,
    arrive: (side) => `ನಿಮ್ಮ ಗಮ್ಯಸ್ಥಾನ ತಲುಪಿದ್ದೀರಿ${side ? ` (${side})` : ''}`,
    inDistance: (dist, instr) => `${dist} ನಂತರ, ${instr}.`,
    sentence: (instr) => `${instr}.`,
    starting: (intro) => `ಸಂಚಲನೆ ಪ್ರಾರಂಭವಾಗಿದೆ. ${intro}`,
    rerouting: 'ಮಾರ್ಗ ಮರುಹೊಂದಿಸಲಾಗುತ್ತಿದೆ.',
    arrived: 'ನೀವು ನಿಮ್ಮ ಗಮ್ಯಸ್ಥಾನ ತಲುಪಿದ್ದೀರಿ.',
    meters: (n) => `${n} ಮೀಟರ್`,
    km: (v) => `${v} ಕಿಲೋಮೀಟರ್`,
  },

  hi: {
    dir: {
      left: 'बाएँ',
      right: 'दाएँ',
      'slight left': 'थोड़ा बाएँ',
      'slight right': 'थोड़ा दाएँ',
      'sharp left': 'तीखा बाएँ',
      'sharp right': 'तीखा दाएँ',
      straight: 'सीधे',
      uturn: 'यू-टर्न',
    },
    compass: ['उत्तर', 'उत्तर-पूर्व', 'पूर्व', 'दक्षिण-पूर्व', 'दक्षिण', 'दक्षिण-पश्चिम', 'पश्चिम', 'उत्तर-पश्चिम'],
    turn: (d, road) => `${road ? `${road} पर ` : ''}${d} मुड़ें`,
    continueStraight: (road) => `${road ? `${road} पर ` : ''}सीधे चलते रहें`,
    uturn: (road) => `${road ? `${road} पर ` : ''}यू-टर्न लें`,
    cont: (road) => `${road ? `${road} पर ` : ''}चलते रहें`,
    keep: (d, road) => `${road ? `${road} की ओर ` : ''}${d} रहें`,
    merge: (d, road) => `${road ? `${road} में ` : ''}${d || 'आगे'} मिलें`,
    head: (c, road) => `${road ? `${road} पर ` : ''}${c || 'आगे'} की ओर बढ़ें`,
    ramp: (d, road) => `${road ? `${road} के लिए ` : ''}रैंप लें${d ? ` (${d})` : ''}`,
    offramp: (d, road) => `${road ? `${road} के लिए ` : ''}निकास लें${d ? ` (${d})` : ''}`,
    roundabout: (ord, road) =>
      ord ? `गोल चक्कर पर ${ord} निकास लें${road ? ` (${road})` : ''}` : `गोल चक्कर में प्रवेश करें${road ? ` (${road})` : ''}`,
    roundaboutTurn: (d, road) => `गोल चक्कर पर ${d} मुड़ें${road ? ` (${road})` : ''}`,
    exitRoundabout: (road) => `गोल चक्कर से बाहर निकलें${road ? ` (${road})` : ''}`,
    arrive: (side) => `आप अपने गंतव्य पर पहुँच गए हैं${side ? ` (${side})` : ''}`,
    inDistance: (dist, instr) => `${dist} में, ${instr}.`,
    sentence: (instr) => `${instr}.`,
    starting: (intro) => `नेविगेशन शुरू हो रहा है। ${intro}`,
    rerouting: 'मार्ग पुनर्निर्धारित किया जा रहा है।',
    arrived: 'आप अपने गंतव्य पर पहुँच गए हैं।',
    meters: (n) => `${n} मीटर`,
    km: (v) => `${v} किलोमीटर`,
  },

  // Tulu (written in Kannada script). No dedicated TTS voice — speech uses the
  // Kannada voice. Phrasing uses common Tulu navigation vocabulary.
  tu: {
    dir: {
      left: 'ಎಡತ್ತ್',
      right: 'ಬಲತ್ತ್',
      'slight left': 'ತುಸು ಎಡತ್ತ್',
      'slight right': 'ತುಸು ಬಲತ್ತ್',
      'sharp left': 'ತೀಕ್ಷ್ಣ ಎಡತ್ತ್',
      'sharp right': 'ತೀಕ್ಷ್ಣ ಬಲತ್ತ್',
      straight: 'ನೇರ',
      uturn: 'ಯು-ತಿರ್ಗ್',
    },
    compass: ['ಉತ್ತರ', 'ಈಶಾನ್ಯ', 'ಪೂರ್ವ', 'ಆಗ್ನೇಯ', 'ದಕ್ಷಿಣ', 'ನೈಋತ್ಯ', 'ಪಶ್ಚಿಮ', 'ವಾಯವ್ಯ'],
    turn: (d, road) => `${road ? `${road} ಗ್ ` : ''}${d} ತಿರ್ಗ್‌ಲೆ`,
    continueStraight: (road) => `${road ? `${road}ಡ್ ` : ''}ನೇರ ಪೋಲೆ`,
    uturn: (road) => `${road ? `${road} ಗ್ ` : ''}ಯು-ತಿರ್ಗ್ ಮಲ್ಪುಲೆ`,
    cont: (road) => `${road ? `${road}ಡ್ ` : ''}ಮುಂದೆ ಪೋಲೆ`,
    keep: (d, road) => `${road ? `${road} ಗ್ ` : ''}${d} ಉಪ್ಪುಲೆ`,
    merge: (d, road) => `${road ? `${road} ಗ್ ` : ''}${d || 'ಮುಂದೆ'} ಸೇರ್‌ಲೆ`,
    head: (c, road) => `${road ? `${road}ಡ್ ` : ''}${c || 'ಮುಂದೆ'} ಪೋಲೆ`,
    ramp: (d, road) => `${road ? `${road} ಗ್ ` : ''}ರ‍್ಯಾಂಪ್ ತೆಕ್ಕೊಣ್ಲೆ${d ? ` (${d})` : ''}`,
    offramp: (d, road) => `${road ? `${road} ಗ್ ` : ''}ನಿರ್ಗಮನ ತೆಕ್ಕೊಣ್ಲೆ${d ? ` (${d})` : ''}`,
    roundabout: (ord, road) =>
      ord ? `ವೃತ್ತೊಡು ${ord} ನಿರ್ಗಮನ ತೆಕ್ಕೊಣ್ಲೆ${road ? ` (${road})` : ''}` : `ವೃತ್ತೊಗು ಪೊಗ್ಗ್‌ಲೆ${road ? ` (${road})` : ''}`,
    roundaboutTurn: (d, road) => `ವೃತ್ತೊಡು ${d} ತಿರ್ಗ್‌ಲೆ${road ? ` (${road})` : ''}`,
    exitRoundabout: (road) => `ವೃತ್ತೊಡ್ದು ಪಿದಡ್‌ಲೆ${road ? ` (${road})` : ''}`,
    arrive: (side) => `ಈರ್ ಗಮ್ಯಸ್ಥಾನೊಗು ಎತ್ತ್‌ದ್‌ರ್${side ? ` (${side})` : ''}`,
    inDistance: (dist, instr) => `${dist} ಬೊಕ್ಕ, ${instr}.`,
    sentence: (instr) => `${instr}.`,
    starting: (intro) => `ಸಂಚಲನೆ ಸುರುವಾತ್ಂಡ್. ${intro}`,
    rerouting: 'ಮಾರ್ಗ ಪುನಃ ಹೊಂದಾವೊಂದುಂಡು.',
    arrived: 'ಈರ್ ಈರೆನ ಗಮ್ಯಸ್ಥಾನೊಗು ಎತ್ತ್‌ದ್‌ರ್.',
    meters: (n) => `${n} ಮೀಟರ್`,
    km: (v) => `${v} ಕಿಲೋಮೀಟರ್`,
  },
}

function lowerFirst(str) {
  if (!str) return str
  return str.charAt(0).toLowerCase() + str.slice(1)
}

function pack(lang) {
  return PACKS[lang] || PACKS[FALLBACK]
}

function compassFromBearing(bearing, lang) {
  if (bearing == null || Number.isNaN(bearing)) return ''
  const idx = Math.round((bearing % 360) / 45) % 8
  return pack(lang).compass[idx]
}

const ORDINALS = {
  en: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'],
  kn: ['1ನೇ', '2ನೇ', '3ನೇ', '4ನೇ', '5ನೇ', '6ನೇ', '7ನೇ', '8ನೇ', '9ನೇ', '10ನೇ'],
  hi: ['पहला', 'दूसरा', 'तीसरा', 'चौथा', 'पाँचवाँ', 'छठा', 'सातवाँ', 'आठवाँ', 'नौवाँ', 'दसवाँ'],
  tu: ['1ನೇ', '2ನೇ', '3ನೇ', '4ನೇ', '5ನೇ', '6ನೇ', '7ನೇ', '8ನೇ', '9ನೇ', '10ನೇ'],
}

function ordinal(n, lang) {
  const v = Number(n)
  if (!v || v < 1) return ''
  const table = ORDINALS[lang] || ORDINALS[FALLBACK]
  return table[v - 1] || `${v}.`
}

function modifierWord(modifier, lang) {
  if (!modifier) return ''
  const p = pack(lang)
  return p.dir[modifier] || modifier.replace(/-/g, ' ')
}

/** Localized maneuver text, e.g. "Turn right onto MG Road" / "MG Road ಗೆ ಬಲಕ್ಕೆ ತಿರುಗಿ". */
export function buildManeuverTextL(step, lang = FALLBACK) {
  if (!step) return ''
  const p = pack(lang)
  const maneuver = step.maneuver || {}
  const type = (maneuver.type || '').toLowerCase()
  const modifier = (maneuver.modifier || '').toLowerCase()
  const road = step.name || step.destinations || ''
  const mod = modifierWord(modifier, lang)

  switch (type) {
    case 'depart':
      return p.head(compassFromBearing(maneuver.bearing_after, lang), road)
    case 'turn':
      if (modifier === 'straight') return p.continueStraight(road)
      if (modifier === 'uturn') return p.uturn(road)
      return p.turn(mod, road)
    case 'new name':
      return p.cont(road)
    case 'continue':
      if (modifier === 'uturn') return p.uturn(road)
      if (mod && modifier !== 'straight') return p.keep(mod, road)
      return p.cont(road)
    case 'merge':
      return p.merge(mod, road)
    case 'on ramp':
      return p.ramp(mod, road)
    case 'off ramp':
      return p.offramp(mod, road)
    case 'fork':
      return p.keep(mod || '', road)
    case 'end of road':
      return p.turn(mod, road)
    case 'roundabout':
    case 'rotary':
      return p.roundabout(ordinal(maneuver.exit, lang), road)
    case 'roundabout turn':
      return p.roundaboutTurn(mod, road)
    case 'exit roundabout':
    case 'exit rotary':
      return p.exitRoundabout(road)
    case 'arrive': {
      const side = modifier === 'left' || modifier === 'right' ? modifierWord(modifier, lang) : ''
      return p.arrive(side)
    }
    case 'notification':
      return p.cont(road)
    default:
      if (mod) return p.turn(mod, road)
      return p.cont(road)
  }
}

/** Localized spoken distance phrasing, e.g. "300 meters" / "300 ಮೀಟರ್". */
export function spokenDistanceL(meters, lang = FALLBACK) {
  if (!Number.isFinite(meters) || meters <= 0) return ''
  const p = pack(lang)
  if (meters < 1000) {
    const rounded =
      meters > 100 ? Math.round(meters / 50) * 50 : Math.max(10, Math.round(meters / 10) * 10)
    return p.meters(rounded)
  }
  const km = meters / 1000
  const value = km < 10 ? Math.round(km * 10) / 10 : Math.round(km)
  return p.km(value)
}

/** Localized spoken announcement for an upcoming maneuver. */
export function buildAnnouncementL(step, distance, immediate = false, lang = FALLBACK) {
  const p = pack(lang)
  const text = buildManeuverTextL(step, lang)
  const type = (step?.maneuver?.type || '').toLowerCase()
  if (type === 'arrive') {
    return immediate ? p.sentence(text) : p.inDistance(spokenDistanceL(distance, lang), text)
  }
  if (immediate || !distance) return p.sentence(text)
  return p.inDistance(spokenDistanceL(distance, lang), text)
}

/** Fixed spoken phrases (start / reroute / arrival). */
export function navPhrase(key, lang = FALLBACK) {
  return pack(lang)[key]
}

export function startingPhrase(intro, lang = FALLBACK) {
  return pack(lang).starting(intro)
}
