import test from 'node:test'
import assert from 'node:assert/strict'
import { mapOpenCategory } from '../utils/openPlaceCategory.js'

test('maps Overture and Foursquare categories onto app categories', () => {
  const cases = [
    ['coffee_shop', 'Restaurant'],
    ['Dining and Drinking > Bar > Sports Bar', 'Restaurant'],
    ['barber', 'Salon'],
    ['atm', 'ATM'],
    ['hindu_place_of_worship', 'Temple'],
    ['gas_station', 'Petrol Pump'],
    ['parking', 'Parking'],
    ['park', 'Tourist Place'],
    ['bus_station', 'Bus Stop'],
    ['Retail > Pharmacy', 'Pharmacy'],
    ['Community and Government > Post Office', 'Post Office'],
    ['primary_school', 'School'],
    ['supermarket', 'Grocery Store'],
    ['clothing_store', 'Shop'],
    ['bank', 'Bank'],
    ['accountant', 'Other'],
    ['train_station', 'Transit'],
    ['police_station', 'Police Station'],
  ]
  for (const [input, expected] of cases) {
    assert.equal(mapOpenCategory(input), expected, input)
  }
})

test('falls back through candidates, then to Other', () => {
  assert.equal(mapOpenCategory(null, undefined, ['unknown thing', 'Hindu Temple']), 'Temple')
  assert.equal(mapOpenCategory('Café'), 'Restaurant')
  assert.equal(mapOpenCategory(), 'Other')
  assert.equal(mapOpenCategory('zzz'), 'Other')
})

// --- Quick Survey: signboard reader output handling -------------------------
const { normalizeSignboardResult } = await import('../services/signboardReaderService.js')

test('normalises a signboard reading into a safe suggestion', () => {
  const r = normalizeSignboardResult({
    readable: true,
    name_en: '  Sri   Durga Bakery ',
    name_local: 'ಶ್ರೀ ದುರ್ಗಾ ಬೇಕರಿ',
    category: 'restaurant',
    kind: 'bakery',
    phone: 'Ph: 98450 12345',
  })
  assert.equal(r.name, 'Sri Durga Bakery')
  assert.equal(r.nameLocal, 'ಶ್ರೀ ದುರ್ಗಾ ಬೇಕರಿ')
  assert.equal(r.category, 'Restaurant')
  assert.equal(r.phone, '9845012345')
  assert.equal(r.readable, true)
})

test('falls back sensibly when the model returns junk', () => {
  const r = normalizeSignboardResult({ name_en: 'null', category: 'Bakery & Sweets', phone: '12' })
  assert.equal(r.name, null)
  assert.equal(r.readable, false)
  assert.equal(r.category, 'Restaurant')
  assert.equal(r.phone, null)
  assert.equal(normalizeSignboardResult(null).category, 'Other')
  assert.equal(normalizeSignboardResult({ name_en: 'Ganesh Medicals', category: 'Other', kind: 'medical store' }).category, 'Pharmacy')
})

// --- Auto-add: duplicate rules, quality threshold, AI reply parsing ----------
const { nameSimilarity, classifyPair, decideRoute } = await import('../utils/openPlaceMatch.js')
const { parseVerdicts } = await import('../services/placeDuplicateAi.js')

test('name similarity ignores honorifics and spelling variants', () => {
  assert.equal(nameSimilarity('Sri Lakshmi Stores', 'Shree Laxmi Store'), 1)
  assert.ok(nameSimilarity('Sri Durga Bakery', 'Shree Durga Bakers') >= 0.6)
  assert.ok(nameSimilarity('Sri Durga Bakery', 'Shree Durga Bakers') < 0.92)
  assert.ok(nameSimilarity('Ganesh Medicals', 'Canara Bank') < 0.3)
})

test('classifies pairs as same, different or ambiguous', () => {
  const at = (name, dLat = 0) => ({ name, lat: 12.75 + dLat, lng: 75.45 })
  // ~120 m apart, spelling variant → rules cannot decide, AI does. Within 60 m it is the same place.
  assert.equal(classifyPair(at('Sri Durga Bakery'), at('Shree Durga Bakers', 0.0011)).verdict, 'ambiguous')
  assert.equal(classifyPair(at('Sri Durga Bakery'), at('Shree Durga Bakers', 0.0004)).verdict, 'same')
  assert.equal(classifyPair(at('Canara Bank'), at('Canara Bank', 0.001)).verdict, 'same')
  // Neighbouring shops on the same spot stay separate.
  assert.equal(classifyPair(at('Ganesh Medicals'), at('Canara Bank')).verdict, 'different')
  // Same name far away is another branch.
  assert.equal(classifyPair(at('Canara Bank'), at('Canara Bank', 0.01)).verdict, 'different')
  assert.equal(classifyPair(at('Durga Bakery'), { name: 'ದುರ್ಗಾ', altName: 'Durga Bakery', lat: 12.75, lng: 75.45 }).verdict, 'same')
})

test('quality threshold routes places to approve, review or skip', () => {
  const p = (over) => ({ name: 'Durga Bakery', category: 'Restaurant', confidence: 0.9, source: 'overture', ...over })
  assert.equal(decideRoute(p()).action, 'approve')
  assert.equal(decideRoute(p({ confidence: 0.7 })).action, 'review')
  assert.equal(decideRoute(p({ confidence: 0.3 })).action, 'skip')
  assert.equal(decideRoute(p({ category: 'Other' })).action, 'review')
  assert.equal(decideRoute(p({ name: '12' })).action, 'skip')
  assert.equal(decideRoute(p({ confidence: null, source: 'csv' })).action, 'review')
  assert.equal(decideRoute(p({ confidence: null, source: 'csv' }), { trustedSources: ['csv'] }).action, 'approve')
})

test('AI verdict parsing never trusts a malformed reply', () => {
  assert.deepEqual(
    parseVerdicts('{"results":[{"i":0,"verdict":"same"},{"i":2,"verdict":"Different"},{"i":9,"verdict":"same"}]}', 3),
    ['same', 'unsure', 'different']
  )
  assert.deepEqual(parseVerdicts('sorry, I cannot', 2), ['unsure', 'unsure'])
  assert.deepEqual(parseVerdicts('```json\n{"results":[{"i":1,"verdict":"maybe"}]}\n```', 2), ['unsure', 'unsure'])
})

test('generic words alone never make two places the same', () => {
  const at = (name, category) => ({ name, category, lat: 12.75, lng: 75.45 })
  assert.ok(nameSimilarity('Sree Ganesh Electronics', 'Prakash Electronics SS') <= 0.4)
  assert.equal(classifyPair(at('Sree Ganesh Electronics'), at('Prakash Electronics SS')).verdict, 'different')
  // A bank and its ATM are separate map entries: left to the AI rather than merged by rule.
  assert.equal(
    classifyPair(at('Indian Overseas Bank', 'Bank'), at('Indian Overseas Bank - ATM', 'ATM')).verdict,
    'ambiguous'
  )
})
