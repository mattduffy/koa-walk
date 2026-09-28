/*
 * file: public/j/Heading.js
 */
import { pointDistance } from './Heading.js'

/**
 * A technique used to reduce the number of points in a curve or polyline while preserving its
 * overall shape.
 * @summary Reduce the number of points in a line.
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @param
 * @return
 */
export function rdp() {
  const perpDistance = pointDistance()
  console.log(perpDistance)
}
