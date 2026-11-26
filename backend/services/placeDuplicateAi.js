/**
 * AI check for ambiguous duplicate pairs in the open-data auto-add job.
 *
 * The rules in utils/openPlaceMatch.js settle the clear cases. Only pairs they
 * cannot settle ("Sri Durga Bakery" vs "Shree Durga Bakers", 40 m apart) come
 * here, in batches. Without a GROQ_API_KEY, or when the call fails, every pair
 * comes back "unsure" and the job holds that place for admin review.
 */
import axios from 'axios'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
/** Tried in order; a model the account no longer has (Groq retires models) is skipped for the rest of the run. */
const MODELS = [
  process.env.GROQ_DEDUP_MODEL,
  'openai/gpt-oss-120b',
  process.env.GROQ_MODEL,
  process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b',
]
  .map((m) => String(m || '').trim())
  .filter((m, i, all) => m && all.indexOf(m) === i)
const TIMEOUT_MS = parseInt(process.env.GROQ_DEDUP_TIMEOUT_MS, 10) || 45000
const BATCH_SIZE = 15

const PROMPT = `You compare pairs of place records from Indian towns and villages and decide whether
both records describe the SAME real-world place (one shop, office, temple, school…).
Spelling differs a lot between sources: "Sri"/"Shree", "Laxmi"/"Lakshmi", "Medicals"/"Medical Store",
missing or extra words such as the town name. Distance is in metres; coordinates from open data can be
off by 100 m or more, so a small distance alone proves nothing and a moderate one does not rule a match out.
Different branches, or two different shops with a similar common name (two "Ganesh Stores"), are "different".
A record that is only a town, village or area name is "different" from a specific place in that town
("Nellyady" vs "Nellyady Mosque"). A bank and its ATM, or a temple and its hall, are "different".
Return ONLY valid JSON: {"results":[{"i":<pair index>,"verdict":"same"|"different"|"unsure"}]}
with one entry per pair. Use "unsure" when the information is not enough.`

export function duplicateAiEnabled() {
  return Boolean((process.env.GROQ_API_KEY || '').trim())
}

/** Turn the model's reply into exactly `count` verdicts; anything missing or odd is "unsure". */
export function parseVerdicts(text, count) {
  const out = new Array(count).fill('unsure')
  let data = null
  const s = String(text || '').trim()
  try {
    data = JSON.parse(s)
  } catch {
    const start = s.indexOf('{')
    const end = s.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        data = JSON.parse(s.slice(start, end + 1))
      } catch {
        data = null
      }
    }
  }
  const list = Array.isArray(data?.results) ? data.results : []
  for (const row of list) {
    const i = Number(row?.i)
    const verdict = String(row?.verdict || '').toLowerCase()
    if (Number.isInteger(i) && i >= 0 && i < count && (verdict === 'same' || verdict === 'different')) {
      out[i] = verdict
    }
  }
  return out
}

const describe = (p) =>
  [p.name, p.category ? `[${p.category}]` : '', p.address ? `— ${String(p.address).slice(0, 120)}` : '']
    .filter(Boolean)
    .join(' ')

async function judgeBatch(pairs, key) {
  const lines = pairs.map(
    (p, i) => `${i}. A: ${describe(p.a)} | B: ${describe(p.b)} | distance: ${Math.round(p.distance)} m`
  )
  const request = () =>
    axios.post(
      GROQ_API_URL,
      {
        model: MODELS[0],
        temperature: 0,
        // Room for the answer plus the thinking some models do first.
        max_tokens: 60 * pairs.length + 1500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content: lines.join('\n') },
        ],
      },
      { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: TIMEOUT_MS }
    )
  try {
    let res
    try {
      res = await request()
    } catch (err) {
      const status = err.response?.status
      const message = String(err.response?.data?.error?.message || '')
      if ((status === 404 || (status === 400 && /model/i.test(message))) && MODELS.length > 1) {
        console.warn(`[auto-add] AI model ${MODELS[0]} is not available, trying ${MODELS[1]}`)
        MODELS.shift()
        return judgeBatch(pairs, key)
      }
      if (status !== 429) throw err
      // Rate limited: wait once, then give up on this batch.
      const wait = Math.min(parseFloat(err.response.headers?.['retry-after']) || 10, 30)
      await new Promise((r) => setTimeout(r, wait * 1000))
      res = await request()
    }
    return parseVerdicts(res.data?.choices?.[0]?.message?.content, pairs.length)
  } catch (err) {
    console.warn('[auto-add] AI duplicate check failed:', err.response?.status || '', err.response?.data?.error?.message || err.message)
    return new Array(pairs.length).fill('unsure')
  }
}

/**
 * @param {Array<{a:{name:string,category?:string,address?:string}, b:{name:string,category?:string,address?:string}, distance:number}>} pairs
 * @returns {Promise<Array<'same'|'different'|'unsure'>>} one verdict per pair, same order
 */
export async function judgeDuplicatePairs(pairs) {
  if (!pairs.length) return []
  const key = (process.env.GROQ_API_KEY || '').trim()
  if (!key) return new Array(pairs.length).fill('unsure')
  const out = []
  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    out.push(...(await judgeBatch(pairs.slice(i, i + BATCH_SIZE), key)))
  }
  return out
}
