/*
 * file: public/j/ctd.js
 */

function deg2Rad(deg) {
  return deg * (Math.PI / 180)
}

// function rad2Deg(rad) {
//   return rad * (180 / Math.PI)
// }

/**
 * Calculate the perpendicular distance (in meters) of a gps point from a track (polyline
 * segment) consisting of two other gps points.
 * @summary Perpendicular distance between a point and a line.
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @param {Number[]} point - Array of coordinate lon/lat values.
 * @param {Number[][]} track - A two point polyline segment: [[lon, lat], [lon, lat]].
 * @param {('m'|'km')} [scale='m'] - Sets the unit size of the track distance, either 'km' or 'm'.
 * @return {Number} - The perpendicular distance of the point from the track (line segment).
 */
export function crossTrackDistance(point, track, scale = 'm') {
  const pointLon = deg2Rad(point[0])
  const pointLat = deg2Rad(point[1])
  const startLon = deg2Rad(track[0][0])
  const startLat = deg2Rad(track[0][1])
  const endLon = deg2Rad(track[1][0])
  const endLat = deg2Rad(track[1][1])

  let acosArgument = Math.sin(startLat) * Math.sin(pointLat)
      + Math.cos(startLat) * Math.cos(pointLat) * Math.cos(pointLon - startLon)
  acosArgument = Math.max(-1, Math.min(1, acosArgument)) // clamp the argument between -1 and 1
  const deltaSigma = Math.acos(acosArgument)

  const thetaPoint = Math.atan2(
    Math.sin(pointLon - startLon) * Math.cos(pointLat),
    Math.cos(startLat) * Math.sin(pointLat) - Math.sin(startLat)
      * Math.cos(pointLat) * Math.cos(pointLon - startLon),
  )
  const thetaEnd = Math.atan2(
    Math.sin(endLon - startLon) * Math.cos(endLat),
    Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat)
      * Math.cos(endLat) * Math.cos(endLon - startLon),
  )

  let xTrackDistance = Math.asin(Math.sin(deltaSigma) * Math.sin(thetaPoint - thetaEnd))
  const EARTH_RADIUS_IN_KM = 6371
  const xscale = (scale === 'km') ? 1 : 1000
  xTrackDistance *= (EARTH_RADIUS_IN_KM * xscale)
  return xTrackDistance
}
