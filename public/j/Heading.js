function rads(degrees) {
  return degrees * (Math.PI / 180)
}

function degs(radians) {
  const deg = radians * (180 / Math.PI)
  console.log(`radians in ${radians} \ndegrees out ${deg}`)
  return deg 
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

export function heading(p1, p2, l = false) {
  console.log('calculating current heading from two points:', p1, p2)
  // L = longitude
  // θ = latitude
  // β = Bearing
  const A = p1
  const B = p2
  const deltaLongitude = Math.max(
    Math.abs(A.longitude), Math.abs(B.longitude))
    - Math.min(Math.abs(A.longitude), Math.abs(B.longitude));
  if (l) console.log('deltaLongitude:', deltaLongitude)
  const deltaLatitude = Math.max(
    Math.abs(A.latitude),
    Math.abs(B.latitude)) - Math.min(
    Math.abs(A.latitude),
    Math.abs(B.latitude))
  if (l) console.log('deltaLatitude:', deltaLatitude)
  const X = Math.cos(rads(B.latitude)) * Math.sin(rads(deltaLongitude))
  if (l) console.log(`X = ${X} = Math.cos(${rads(B.latitude)}) * Math.sin(${rads(deltaLongitude)})`)
  const Y = (Math.cos(rads(A.latitude)) * Math.sin(rads(B.latitude)))
     - (Math.sin(rads(A.latitude)) * Math.cos(rads(B.latitude)) * Math.cos(rads(deltaLongitude)))
  if (l) console.log(`Y = ${Y} = (Math.cos(${rads(A.latitude)} * Math.sin(${rads(B.latitude)}))`
    + `- (Math.sin(${rads(A.latitude)}) * Math.cos(${rads(B.latitude)}) * Math.cos(${rads(deltaLongitude)}))`)
  if (l) console.log(`Y = ${Y} = (${Math.cos(rads(A.latitude))} * ${Math.sin(rads(B.latitude))})`
    + `- (${Math.sin(rads(A.latitude))} * ${Math.cos(rads(B.latitude))} * ${Math.cos(rads(deltaLongitude))})`)
  const β = Math.atan2(X, Y)
  if (l) console.log(`${β} = Math.atan2(${X}, ${Y})`)
  return Math.round(degs(β) * 10) / 10
}
