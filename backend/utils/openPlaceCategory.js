/**
 * Maps open-data category strings (Overture `basic_category` / `taxonomy.primary`,
 * Foursquare category labels, government dataset labels) onto the app's own
 * place categories. First matching rule wins, so specific rules come first.
 */

const RULES = [
  ['ATM', /\batm\b/],
  ['Pharmacy', /pharmac|chemist|drug ?store|drugstore|medical ?(store|shop)/],
  ['Hospital', /hospital|clinic|doctor|dentist|dental|health|medical|nursing|diagnostic|veterinar|physician|ayurved/],
  ['Petrol Pump', /gas ?station|fuel|petrol|ev ?charging|charging ?station/],
  ['Police Station', /police/],
  ['Post Office', /post ?office|postal/],
  ['Bank', /\bbank|credit ?union|money ?transfer/],
  ['Bus Stop', /bus ?(stop|station|stand|terminal)/],
  ['Transit', /train|railway|rail |metro|subway|airport|ferry|taxi|transport|transit|rickshaw/],
  ['Parking', /parking/],
  ['Museum', /museum|art ?gallery|gallery/],
  ['Cinema', /cinema|movie|theat(er|re)/],
  ['Gym', /\bgym|fitness|yoga|sports ?club|martial/],
  ['Salon', /salon|barber|beauty|spa\b|hair|nail|tattoo/],
  [
    'Temple',
    /temple|mosque|church|shrine|gurdwara|gurudwara|monastery|synagogue|religio|worship|mandir|masjid|dargah|basadi|\bmath\b|ashram|spiritual/,
  ],
  ['School', /school|college|universit|education|kindergarten|preschool|academy|institute|tuition|coaching|library|anganwadi/],
  ['Hotel', /hotel|motel|resort|lodg|hostel|guest ?house|homestay|accommodation|bed ?and ?breakfast|inn\b|dharamshala/],
  [
    'Restaurant',
    /restaurant|cafe|coffee|bakery|food|dining|eatery|bar\b|pub\b|pizza|burger|biryani|tea ?(house|room|shop)|ice ?cream|dessert|juice|sweet|caterer|dhaba|tiffin|canteen|brewery|diner/,
  ],
  ['Grocery Store', /grocer|supermarket|convenience|kirana|provision|vegetable|fruit|butcher|meat|fish ?market|dairy|ration/],
  [
    'Tourist Place',
    /tourist|attraction|landmark|monument|historic|park\b|garden|beach|waterfall|viewpoint|zoo|aquarium|fort\b|palace|lake|dam\b|trail|hiking|nature|wildlife|heritage|memorial|scenic/,
  ],
  [
    'Shop',
    /shop|store|retail|mall|market|boutique|jewel|cloth|fashion|electronic|mobile ?phone|hardware|furniture|book|stationer|florist|optician|dealer|showroom|textile|footwear|shoe|tailor|laundry|repair|bazaar/,
  ],
]

/** Normalise "Dining and Drinking > Café" / "coffee_shop" → "dining and drinking cafe". */
function normalise(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * @param {...(string|string[]|null|undefined)} candidates most specific first
 * @returns {string} one of the app's place categories ("Other" when unknown)
 */
export function mapOpenCategory(...candidates) {
  const flat = candidates.flat().filter(Boolean).map(normalise).filter(Boolean)
  for (const text of flat) {
    for (const [category, pattern] of RULES) {
      if (pattern.test(text)) return category
    }
  }
  return 'Other'
}

export const OPEN_PLACE_SOURCES = {
  overture: {
    label: 'Overture Maps',
    license: 'CDLA-Permissive-2.0 / Apache-2.0 (per source)',
    url: 'https://overturemaps.org',
  },
  foursquare: {
    label: 'Foursquare OS Places',
    license: 'Apache-2.0',
    url: 'https://opensource.foursquare.com/os-places/',
  },
  csv: {
    label: 'Imported dataset',
    license: 'See dataset',
    url: null,
  },
}
