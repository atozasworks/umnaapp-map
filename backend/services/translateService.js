/**
 * Translation service for Add Place feature.
 * Uses Aksharamukha public web API for script conversion/transliteration.
 */

import axios from 'axios'

const AKSHARAMUKHA_API_URL = process.env.AKSHARAMUKHA_API_URL || 'https://aksharamukha-plugin.appspot.com/api/public'
const GOOGLE_TRANSLATE_API_URL = process.env.GOOGLE_TRANSLATE_API_URL || 'https://translate.googleapis.com/translate_a/single'

/** ISO 639-1 language -> Aksharamukha target script identifier */
const LANG_TO_AKSHARA_TARGET = {
  hi: 'Devanagari',
  mr: 'Devanagari',
  ne: 'Devanagari',
  sa: 'Devanagari',
  kn: 'Kannada',
  ta: 'Tamil',
  te: 'Telugu',
  ml: 'Malayalam',
  gu: 'Gujarati',
  bn: 'Bengali',
  as: 'Assamese',
  pa: 'Gurmukhi',
  or: 'Oriya',
  mni: 'MeeteiMayek',
}

/** Common map/place terms for better local-language word quality. */
const PLACE_TERM_GLOSSARY = {
  kn: {
    'bus stand': 'ಬಸ್ ಸ್ಟ್ಯಾಂಡ್',
    road: 'ರಸ್ತೆ',
    street: 'ಬೀದಿ',
    temple: 'ದೇವಾಲಯ',
    hospital: 'ಆಸ್ಪತ್ರೆ',
    school: 'ಶಾಲೆ',
    bank: 'ಬ್ಯಾಂಕ್',
    station: 'ನಿಲ್ದಾಣ',
    market: 'ಮಾರುಕಟ್ಟೆ',
    circle: 'ವೃತ್ತ',
    junction: 'ಜಂಕ್ಷನ್',
    bridge: 'ಸೇತುವೆ',
  },
  ta: {
    'bus stand': 'பஸ் நிலையம்',
    road: 'சாலை',
    street: 'தெரு',
    temple: 'கோவில்',
    hospital: 'மருத்துவமனை',
    school: 'பள்ளி',
    bank: 'வங்கி',
    station: 'நிலையம்',
    market: 'சந்தை',
    bridge: 'பாலம்',
  },
  te: {
    'bus stand': 'బస్ స్టాండ్',
    road: 'రోడు',
    street: 'వీధి',
    temple: 'దేవాలయం',
    hospital: 'ఆసుపత్రి',
    school: 'పాఠశాల',
    bank: 'బ్యాంక్',
    station: 'స్టేషన్',
    market: 'మార్కెట్',
    bridge: 'వంతెన',
  },
  ml: {
    'bus stand': 'ബസ് സ്റ്റാൻഡ്',
    road: 'റോഡ്',
    street: 'വീഥി',
    temple: 'ക്ഷേത്രം',
    hospital: 'ആശുപത്രി',
    school: 'സ്കൂൾ',
    bank: 'ബാങ്ക്',
    station: 'സ്റ്റേഷൻ',
    market: 'മാർക്കറ്റ്',
    bridge: 'പാലം',
  },
  hi: {
    'bus stand': 'बस स्टैंड',
    road: 'रोड',
    street: 'गली',
    temple: 'मंदिर',
    hospital: 'अस्पताल',
    school: 'स्कूल',
    bank: 'बैंक',
    station: 'स्टेशन',
    market: 'बाजार',
    bridge: 'पुल',
  },
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function applyPlaceGlossary(text, targetLang) {
  const glossary = PLACE_TERM_GLOSSARY[targetLang]
  if (!glossary) return text

  let output = text
  const entries = Object.entries(glossary).sort((a, b) => b[0].length - a[0].length)
  for (const [term, replacement] of entries) {
    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'gi')
    output = output.replace(regex, replacement)
  }
  return output
}

async function transliterateSegment(segment, targetScript) {
  const normalized = (segment || '').trim().replace(/\s+/g, ' ')
  if (!normalized) return segment

  const response = await axios.get(AKSHARAMUKHA_API_URL, {
    params: {
      source: 'HK',
      target: targetScript,
      text: normalized.toLowerCase(),
    },
    timeout: 10000,
    headers: {
      'User-Agent': 'UMNAAPP-Map-Platform/1.0 (contact@atozas.com)',
    },
  })

  const convertedText = typeof response.data === 'string' ? response.data.trim() : ''
  const cleanedText = convertedText.replace(/[\u00B2\u00B3\u00B9\u2070-\u2079\u2080-\u2089]/g, '')
  return cleanedText || segment
}

async function transliterateLatinSegments(text, targetScript) {
  const latinRegex = /[A-Za-z][A-Za-z' -]*/g
  let result = ''
  let lastIndex = 0
  let match

  while ((match = latinRegex.exec(text)) !== null) {
    result += text.slice(lastIndex, match.index)

    const rawSegment = match[0]
    const trailingSpaces = rawSegment.match(/\s+$/)?.[0] || ''
    const translated = await transliterateSegment(rawSegment, targetScript)
    result += translated + trailingSpaces

    lastIndex = match.index + rawSegment.length
  }

  result += text.slice(lastIndex)
  return result
}

async function translateViaGoogle(text, targetLang) {
  const response = await axios.get(GOOGLE_TRANSLATE_API_URL, {
    params: {
      client: 'gtx',
      sl: 'en',
      tl: targetLang,
      dt: 't',
      q: text,
    },
    timeout: 10000,
    headers: {
      'User-Agent': 'UMNAAPP-Map-Platform/1.0 (contact@atozas.com)',
    },
  })

  const data = response.data
  if (!Array.isArray(data) || !Array.isArray(data[0])) return ''

  const translated = data[0]
    .map((part) => (Array.isArray(part) ? String(part[0] || '') : ''))
    .join('')
    .trim()

  return translated
}

/** State/region -> ISO 639-1 language code for Indian languages */
export const STATE_TO_LANG = {
  Karnataka: 'kn',
  'Tamil Nadu': 'ta',
  Kerala: 'ml',
  'Andhra Pradesh': 'te',
  Telangana: 'te',
  'Madhya Pradesh': 'hi',
  'Uttar Pradesh': 'hi',
  Rajasthan: 'hi',
  Bihar: 'hi',
  Punjab: 'pa',
  Maharashtra: 'mr',
  Gujarat: 'gu',
  'West Bengal': 'bn',
  Odisha: 'or',
  Assam: 'as',
  Goa: 'mr',
  Delhi: 'hi',
  Haryana: 'hi',
  'Himachal Pradesh': 'hi',
  Uttarakhand: 'hi',
  Jharkhand: 'hi',
  Chhattisgarh: 'hi',
  Mizoram: 'mni',
  Manipur: 'mni',
  Nagaland: 'en',
  Sikkim: 'hi',
  Tripura: 'bn',
  Meghalaya: 'en',
  'Arunachal Pradesh': 'en',
}

const NORMALIZED_STATE_TO_LANG = Object.entries(STATE_TO_LANG).map(([name, lang]) => ({
  name: name.toLowerCase(),
  lang,
}))

/** ISO 3166-2 state code (e.g. IN-KA) -> language */
const ISO_STATE_TO_LANG = {
  'IN-KA': 'kn',  // Karnataka
  'IN-TN': 'ta',  // Tamil Nadu
  'IN-KL': 'ml',  // Kerala
  'IN-AP': 'te',  // Andhra Pradesh
  'IN-TG': 'te',  // Telangana
  'IN-MP': 'hi',
  'IN-UP': 'hi',
  'IN-RJ': 'hi',
  'IN-MH': 'mr',
  'IN-GJ': 'gu',
  'IN-WB': 'bn',
  'IN-PB': 'pa',
}

/** Karnataka district names (substring match) -> kn */
const KARNATAKA_DISTRICTS = ['Dakshina Kannada', 'Udupi', 'Bengaluru', 'Bangalore', 'Mangalore', 'Mysore', 'Mysuru', 'Belgaum', 'Hubli', 'Dharwad', 'Mangaluru', 'Shimoga', 'Shivamogga', 'Tumakuru', 'Davanagere', 'Ballari', 'Vijayapura', 'Kalaburagi', 'Raichur', 'Bidar', 'Kolar', 'Chikkaballapur', 'Koppal', 'Gadag', 'Haveri', 'Chitradurga', 'Hassan', 'Chamarajanagar', 'Mandya', 'Ramnad', 'Kodagu', 'Chikkamagaluru', 'Bagalkot', 'Yadgir', 'Vijayanagara']

/** Tamil Nadu district names -> ta */
const TAMILNADU_DISTRICTS = ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Erode', 'Vellore', 'Thoothukudi', 'Dindigul', 'Thanjavur', 'Ranipet', 'Sivaganga', 'Karur', 'Tenkasi', 'Nagapattinam', 'Kanchipuram', 'Kanyakumari', 'Ramanathapuram', 'Virudhunagar', 'Tiruvannamalai', 'Cuddalore', 'Kallakurichi', 'Tirupattur', 'Krishnagiri', 'Dharmapuri', 'Nilgiris', 'Theni', 'Namakkal', 'Perambalur', 'Mayiladuthurai', 'Ariyalur', 'Pudukkottai']

/**
 * Detect target language from address (state/region).
 * Checks state, ISO3166-2-lvl4, and district names for Karnataka/Tamil Nadu.
 * @param {object} address - Nominatim address object { state, state_district, ISO3166-2-lvl4, ... }
 * @returns {string} ISO 639-1 language code (e.g. 'kn', 'ta', 'hi')
 */
export function getLanguageFromAddress(address) {
  if (!address || typeof address !== 'object') return 'hi'

  const normalize = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()

  const matchStateLanguage = (value) => {
    const normalizedValue = normalize(value)
    if (!normalizedValue) return null

    const exact = NORMALIZED_STATE_TO_LANG.find((entry) => entry.name === normalizedValue)
    if (exact) return exact.lang

    const contains = NORMALIZED_STATE_TO_LANG.find((entry) => normalizedValue.includes(entry.name))
    return contains?.lang || null
  }

  // 1. Direct state match
  const state = address.state || address.region || address.province || ''
  let lang = matchStateLanguage(state)
  if (lang) return lang

  // 2. ISO 3166-2 state code (e.g. IN-KA for Karnataka)
  const isoState = address['ISO3166-2-lvl4'] || address['ISO3166-2-lvl3'] || ''
  lang = ISO_STATE_TO_LANG[isoState] || ISO_STATE_TO_LANG[isoState?.trim?.()]
  if (lang) return lang

  // 3. District / state_district - Karnataka districts -> Kannada
  const district = (address.state_district || address.county || address.district || '').toString()
  const districtLower = district.toLowerCase()
  if (KARNATAKA_DISTRICTS.some((d) => districtLower.includes(d.toLowerCase()))) return 'kn'
  if (TAMILNADU_DISTRICTS.some((d) => districtLower.includes(d.toLowerCase()))) return 'ta'

  // 4. Search all address values for state names (umnaapp.in may nest differently)
  const allValues = Object.values(address).map((v) => normalize(v))
  for (const value of allValues) {
    lang = matchStateLanguage(value)
    if (lang) return lang
  }

  if (allValues.some((v) => v.includes('tamilnadu'))) return 'ta'
  if (allValues.some((v) => v.includes('andhra') || v.includes('telangana'))) return 'te'

  return 'hi' // default North India / Hindi
}

/**
 * Translate text from English to target language.
 * Uses Aksharamukha public API for transliteration into target script.
 *
 * @param {string} text - English text to translate
 * @param {string} targetLang - ISO 639-1 code (kn, ta, ml, te, hi, etc.)
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, targetLang) {
  const trimmed = (text || '').trim()
  if (!trimmed) return ''
  if (targetLang === 'en') return trimmed

  const normalizedTargetLang = (targetLang || '').trim().toLowerCase()
  const targetScript = LANG_TO_AKSHARA_TARGET[normalizedTargetLang] || 'Devanagari'

  try {
    // 1) Meaning-based translation first (better word correctness for Kannada/Tamil/Telugu etc.)
    const semanticTranslation = await translateViaGoogle(trimmed, normalizedTargetLang)
    if (semanticTranslation) {
      return semanticTranslation
    }

    // 2) Fallback: glossary + Aksharamukha transliteration
    const glossaryApplied = applyPlaceGlossary(trimmed, normalizedTargetLang)
    if (!/[A-Za-z]/.test(glossaryApplied)) return glossaryApplied

    const converted = await transliterateLatinSegments(glossaryApplied, targetScript)
    return converted?.trim() || glossaryApplied
  } catch (err) {
    console.warn('Aksharamukha transliteration failed:', err.message)
    return trimmed
  }
}
