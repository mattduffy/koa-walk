function rads(degrees) {
  return degrees * (Math.PI / 180)
}

export function pointDistance(p1, p2, u = 'metric') {
  console.log('pointDistances(p1, p2, u): ', p1, p2, u)
  const earthRadiusKm = 6371
  const earthRadiusMeters = 6371000
  const earthRadiusMi = 3959
  const _u = u.toLowerCase()
  let r
  if (_u === 'metric' || _u === 'meters') {
    r = earthRadiusMeters
  } else if (_u === 'km') {
    r = earthRadiusKm
  } else if (_u === 'miles' || _u === 'mi' || _u === 'imperial') {
    r = earthRadiusMi
  } else {
    r = earthRadiusMeters
    console.log('No units given, default to earth radius in meters')
  }
  console.log(`Heading::pointDistance() using earth radius: ${r} ${_u}`)
  const dLat = rads(p2.latitude - p1.latitude)
  const dLon = rads(p2.longitude - p1.longitude)
  const lat1 = rads(p1.latitude)
  const lat2 = rads(p2.latitude)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
          + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return r * c
}

export function heading(p1, p2) {
  console.log(`calculating current heading from two points: ${p1} and ${p2}`)
}
