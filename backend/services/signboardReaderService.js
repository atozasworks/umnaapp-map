/**
 * Quick Survey: read a shop / place signboard photo and suggest the place
 * name and category. Uses a Groq vision model; when no key is configured (or
 * the call fails) the caller gets aiEnabled:false and the surveyor types the
 * name by hand — the survey flow never blocks on AI.
 */
import axios from 'axios'
import { mapOpenCategory } from '../utils/openPlaceCategory.js'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const VISION_MODEL = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b'
const TIMEOUT_MS = parseInt(process.env.GROQ_VISION_TIMEOUT_MS, 10) || 20000

export const SURVEY_CATEGORIES = [
  'Restaurant', 'Hospital', 'Hotel', 'Parking', 'Shop', 'Grocery Store', 'School', 'Temple',
  'Bank', 'Post Office', 'Bus Stop', 'Police Station', 'Petrol Pump', 'Tourist Place', 'Transit',
  'Museum', 'Pharmacy', 'ATM', 'Cinema', 'Gym', 'Salon', 'Other',
]

const PROMPT = `You are helping a field surveyor in India add a place to a map.
The photo shows the front of a shop, office, temple, school or other place, usually with a signboard.
Read the signboard and return ONLY valid JSON (no markdown) with this exact shape:
{
  "readable": boolean,
  "name_en": string|null,
  "name_local": string|null,
  "category": string,
  "kind": string|null,
  "phone": string|null
}
Rules:
- name_en: the place's own name in English / Latin letters. If the board is only in an Indian script
  (Kannada, Tulu, Tamil, Hindi, Marathi, Malayalam, Telugu…), transliterate it to Latin letters.
  Use Title Case. Do NOT include the address, phone number, slogans, "Prop:", GST numbers or brand adverts.
- name_local: the name exactly as written in the Indian script on the board, or null if the board is only in English.
- category: exactly one of: ${SURVEY_CATEGORIES.join(', ')}.
- kind: 1-3 plain English words for what the place is (e.g. "bakery", "mobile repair", "tailor"), or null.
- phone: a phone number printed on the board (digits, may start with +91), or null.
- If no name can be read, set readable to false and name_en to null; still guess category from what is visible.`

export function signboardAiEnabled() {
  return Boolean((process.env.GROQ_API_KEY || '').trim())
}

const clean = (value, max) => {
  if (value == null) return null
  const s = String(value).replace(/\s+/g, ' ').trim()
  return s && s.toLowerCase() !== 'null' ? s.slice(0, max) : null
}

function cleanPhone(value) {
  const s = clean(value, 40)
  if (!s) return null
  const digits = s.replace(/[^\d+]/g, '')
  return digits.replace(/\D/g, '').length >= 8 ? digits.slice(0, 16) : null
}

/** Turn the model's raw JSON into a safe suggestion object. */
export function normalizeSignboardResult(raw) {
  const data = raw && typeof raw === 'object' ? raw : {}
  const name = clean(data.name_en, 200)
  const nameLocal = clean(data.name_local, 200)
  const kind = clean(data.kind, 60)
  const given = clean(data.category, 50)
  const category =
    SURVEY_CATEGORIES.find((c) => c.toLowerCase() === String(given || '').toLowerCase()) ||
    mapOpenCategory(given, kind, name)
  return {
    readable: Boolean(name) && data.readable !== false,
    name,
    nameLocal: nameLocal && nameLocal !== name ? nameLocal : null,
    // "Other" from the model is a weak answer — let the kind/name keywords refine it.
    category: category === 'Other' ? mapOpenCategory(kind, name) : category,
    kind,
    phone: cleanPhone(data.phone),
  }
}

function parseJsonLoose(text) {
  const s = String(text || '').trim()
  try {
    return JSON.parse(s)
  } catch {
    const start = s.indexOf('{')
    const end = s.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(s.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

/**
 * @param {string} imageDataUrl data:image/jpeg;base64,… (already size-checked by the route)
 * @returns {Promise<{aiEnabled:boolean, readable?:boolean, name?:string|null, nameLocal?:string|null,
 *   category?:string, kind?:string|null, phone?:string|null, reason?:string}>}
 */
export async function readSignboard(imageDataUrl) {
  if (!signboardAiEnabled()) return { aiEnabled: false, reason: 'not_configured' }
  try {
    const { data } = await axios.post(
      GROQ_API_URL,
      {
        model: VISION_MODEL,
        temperature: 0.1,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              { type: 'image_url', image_url: { url: imageDataUrl } },
            ],
          },
        ],
      },
      {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY.trim()}`, 'Content-Type': 'application/json' },
        timeout: TIMEOUT_MS,
      }
    )
    const parsed = parseJsonLoose(data?.choices?.[0]?.message?.content)
    if (!parsed) return { aiEnabled: true, readable: false, reason: 'unparseable' }
    return { aiEnabled: true, ...normalizeSignboardResult(parsed) }
  } catch (err) {
    const status = err.response?.status
    console.warn('[survey] signboard read failed:', status || '', err.response?.data?.error?.message || err.message)
    return { aiEnabled: false, reason: status === 429 ? 'rate_limited' : 'unavailable' }
  }
}
