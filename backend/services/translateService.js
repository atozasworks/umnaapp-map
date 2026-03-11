/**
 * Translation service for Add Place feature.
 * Uses atozas-traslate package (Google Translate public endpoint).
 */

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

  // 1. Direct state match
  const state = address.state || address.region || address.province || ''
  let lang = STATE_TO_LANG[state] || STATE_TO_LANG[state?.trim?.()]
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
  const allValues = Object.values(address).map((v) => String(v || ''))
  if (allValues.some((v) => v.includes('Karnataka'))) return 'kn'
  if (allValues.some((v) => v.includes('Tamil Nadu') || v.includes('Tamilnadu'))) return 'ta'
  if (allValues.some((v) => v.includes('Kerala'))) return 'ml'
  if (allValues.some((v) => v.includes('Andhra') || v.includes('Telangana'))) return 'te'

  return 'hi' // default North India / Hindi
}

/**
 * Translate text from English to target language.
 * Uses atozas-traslate package (Google Translate public endpoint).
 *
 * @param {string} text - English text to translate
 * @param {string} targetLang - ISO 639-1 code (kn, ta, ml, te, hi, etc.)
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, targetLang) {
  const trimmed = (text || '').trim()
  if (!trimmed) return ''
  if (targetLang === 'en') return trimmed

  try {
    const { translateText: atozasTranslate } = await import('atozas-traslate')
    const translated = await atozasTranslate(trimmed, 'en', targetLang)
    return translated || trimmed
  } catch (err) {
    console.warn('atozas-traslate failed:', err.message)
    return trimmed
  }
}
