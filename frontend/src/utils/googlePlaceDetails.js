/** Google Places API fields for full place detail extraction. */
export const GOOGLE_DETAILS_FIELDS = [
  'place_id',
  'name',
  'formatted_address',
  'address_components',
  'geometry',
  'types',
  'formatted_phone_number',
  'international_phone_number',
  'website',
  'rating',
  'user_ratings_total',
  'opening_hours',
  'business_status',
  'reviews',
  'editorial_summary',
  'photos',
  'vicinity',
  'url',
]

export function parseAddressComponents(components) {
  if (!Array.isArray(components)) return {}
  const byType = {}
  for (const c of components) {
    for (const t of c.types || []) {
      if (!byType[t]) byType[t] = c.long_name
    }
  }
  return {
    village:
      byType.locality ||
      byType.sublocality ||
      byType.sublocality_level_1 ||
      byType.neighborhood ||
      null,
    taluk: byType.administrative_area_level_3 || byType.administrative_area_level_2 || null,
    district: byType.administrative_area_level_2 || byType.administrative_area_level_1 || null,
    state: byType.administrative_area_level_1 || null,
    country: byType.country || null,
    pincode: byType.postal_code || null,
  }
}

function photoUrls(photos, max = 5) {
  if (!Array.isArray(photos) || !photos.length) return []
  return photos.slice(0, max).map((ph) => ({
    width: ph.width,
    height: ph.height,
    html_attributions: ph.html_attributions,
    url: ph.getUrl ? ph.getUrl({ maxWidth: 800, maxHeight: 600 }) : null,
  }))
}

function mapReviews(reviews) {
  if (!Array.isArray(reviews)) return null
  return reviews.slice(0, 5).map((r) => ({
    author_name: r.author_name,
    rating: r.rating,
    text: r.text,
    relative_time_description: r.relative_time_description,
    time: r.time,
  }))
}

/** Map Google getDetails result + region context to bulk-save payload. */
export function mapGoogleDetailsToPayload(details, regionContext = {}, zoomLevel = 15) {
  if (!details) return null
  const addr = parseAddressComponents(details.address_components)
  const lat = details.geometry?.location?.lat?.() ?? details.geometry?.location?.lat
  const lng = details.geometry?.location?.lng?.() ?? details.geometry?.location?.lng

  return {
    name: details.name,
    lat,
    lng,
    zoomLevel,
    place_id: details.place_id,
    type: details.types?.[0] || null,
    types: details.types || null,
    vicinity: details.vicinity || null,
    address: details.formatted_address,
    address_components: details.address_components,
    village: regionContext.village || addr.village,
    taluk: regionContext.taluk || addr.taluk,
    district: regionContext.district || addr.district,
    state: regionContext.state || addr.state,
    country: regionContext.country || addr.country,
    pincode: addr.pincode,
    phone: details.formatted_phone_number || details.international_phone_number,
    website: details.website,
    rating: details.rating,
    user_ratings_total: details.user_ratings_total,
    opening_hours: details.opening_hours
      ? {
          open_now: details.opening_hours.open_now,
          weekday_text: details.opening_hours.weekday_text,
          periods: details.opening_hours.periods,
        }
      : null,
    business_status: details.business_status,
    description: details.editorial_summary?.overview || null,
    reviews: mapReviews(details.reviews),
    google_photos: photoUrls(details.photos),
    maps_url: details.url,
    extracted_at: new Date().toISOString(),
  }
}

/** Fetch full details for a place via PlacesService.getDetails (queued). */
export function fetchPlaceDetails(placesService, placeId, enqueueApiCall) {
  return new Promise((resolve) => {
    const run = (done) => {
      placesService.getDetails(
        { placeId, fields: GOOGLE_DETAILS_FIELDS },
        (details, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && details) {
            done(details)
          } else {
            done(null)
          }
        }
      )
    }
    if (enqueueApiCall) {
      enqueueApiCall((done) => run(done))
    } else {
      run(resolve)
    }
  })
}

/** Enrich an array of places that have place_id; merges region context. */
export async function enrichPlacesWithDetails(places, placesService, enqueueApiCall, regionContext = {}, onProgress) {
  const out = []
  let i = 0
  for (const place of places) {
    i++
    onProgress?.(i, places.length, place.name)
    const pid = place.place_id || place.placeId
    if (pid && placesService) {
      const details = await fetchPlaceDetails(placesService, pid, enqueueApiCall)
      if (details) {
        const mapped = mapGoogleDetailsToPayload(details, {
          village: place.village || regionContext.village,
          taluk: place.taluk || regionContext.taluk,
          district: place.district || regionContext.district,
          state: place.state || regionContext.state,
          country: place.country || regionContext.country,
        }, place.zoomLevel ?? 15)
        out.push({ ...place, ...mapped })
        continue
      }
    }
    out.push({
      ...place,
      extracted_at: place.extracted_at || new Date().toISOString(),
    })
  }
  return out
}
