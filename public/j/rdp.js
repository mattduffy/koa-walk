/*
 * file: public/j/rdp.js
 */
import { crossTrackDistance } from './ctd.js'

/**
 * A technique used to reduce the number of points in a curve or polyline while preserving its
 * overall shape.
 * @summary Reduce the number of points in a line.
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @param {Number[][]} points - Array of coordinate arrays.
 * @param {Number} [epsilon=2.0] - A distance threshold value > 0.
 * @throws {Error} - Throws an error if points array has < 2 elements.
 * @return {Number[][]} - A new list of gps points, as equal lengths as points, or fewer.
 */
export function ramerDouglasPeucker(points, epsilon = 2.0) {
  if (points.length < 2) {
    const msg = 'The points array must have at least two elements.'
    throw new Error(msg)
  }
  let maxDistance = 0
  let index = 0
  const end = points.length || 0
  // console.log(
  //   `points.length: ${points.length}, epsilon: ${epsilon}, max_distance: ${maxDistance} `,
  //   `index: ${index}, end: ${end}`,
  // )
  for (let i = 1; i < end - 1; i += 1) {
    const d = Math.abs(crossTrackDistance(points[i], [points[0], points[end - 1]]))
    if (d > maxDistance) {
      index = i
      maxDistance = d
    }
  }
  let simplifiedList
  if (maxDistance > epsilon) {
    const recResultLeft = ramerDouglasPeucker(points.slice(0, index + 1), epsilon)
    const recResultRight = ramerDouglasPeucker(points.slice(index, end), epsilon)
    // The two slices overlap at points[index], so drop the duplicate copy at the seam.
    simplifiedList = [...recResultLeft.slice(0, -1), ...recResultRight]
    // console.log('simplifiedList length:', simplifiedList.length)
  } else {
    simplifiedList = [points[0], points[end - 1]]
  }
  return simplifiedList
}
