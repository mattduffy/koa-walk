import Subject from './Subject.js'
import { pointDistance } from './Heading.js'

function normalizePosition(c) {
  console.log('normalizePosition(c): ', c)
  if (c.constructor.name === 'GeolocationPosition') {
    console.log('normalizing GeoLocationPosition into smaller obj.')
    return {
      latitude: c.coords.latitude,
      longitude: c.coords.longitude,
      accuracy: c.coords.accuracy,
      timestamp: c.timestamp,
      distance: c.distance ?? 0,
    }
  }
  return c
}
class State extends Subject {
  constructor() {
    super()
    this.state = {
      active: false,
      date: null,
      name: null,
      location: null,
      startTime: null,
      startPosition: null,
      currentPosition: null,
      endPosition: null,
      endTime: null,
      wayPoints: [],
      c: [],
      duration: null,
      distance: null,
    }
  }

  update(data = {}) {
    this.state = Object.assign(this.state, data)
    this.notify(this.state)
  }

  clear() {
    this.state.active = false
    this.state.date = null
    this.state.name = null
    this.state.startTime = null
    this.state.startPosition = null
    // this.state.currentPosition = null
    this.state.endPosition = null
    this.state.endTime = null
    this.state.wayPoints = []
    this.state.c = []
    this.state.duration = null
    this.state.distance = null
  }

  get totalDistance() {
    if (!this.state.distance) {
      const x = this.state.wayPoints.reduce(
        (a, c) => {
          console.log(`accumulator: ${a}`)
          console.log('currentValue: ', c)
          return a + c.distance
        },
        0,
      )
      console.log('State::totalDistance() = ', x)
      return x || 0
    }
    console.log('State::totalDistance() = ', this.state.distance)
    return this.state.distance
  }

  get duration() {
    return this.state.duration
  }

  set duration(d = null) {
    if (!d) {
      this.state.duration = this.state.endTime - this.state.startTime
    } else {
      this.state.duration = d
    }
  }

  set date(d) {
    this.state.date = d
  }

  get date() {
    return this.state.date
  }

  set name(name = '') {
    this.state.name = name
  }

  get name() {
    return this.state.name
  }

  set location(location = '') {
    this.state.location = location
  }

  get location() {
    return this.state.location
  }

  set active(s) {
    this.state.active = s
  }

  get active() {
    return this.state.active
  }

  set startTime(t) {
    this.state.startTime = t
  }

  get startTime() {
    return this.state.startTime
  }

  set endTime(t) {
    this.state.endTime = t
  }

  get endTime() {
    return this.state.endTime
  }

  set startPosition(c = {}) {
    this.state.startPosition = normalizePosition(c)
  }

  get startPosition() {
    return this.state.startPosition
  }

  set currentPosition(c) {
    console.log('setCurrentPosition(c): ', c)
    this.state.currentPosition = normalizePosition(c)
    console.log('current position is now: ', this.state.currentPosition)
  }

  get currentPosition() {
    return this.state.currentPosition
  }

  set endPosition(c) {
    this.state.endPosition = normalizePosition(c)
  }

  get endPosition() {
    return this.state.endPosition
  }

  get points() {
    return this.state.wayPoints
  }

  get c() {
    return this.state.c
  }

  set c(p) {
    this.state.c.push(p)
  }

  addPoint(p, u = 'metric') {
    console.log('State::addPoint(p, u): ', p, u)
    const point = p
    let prev
    if (this.state.wayPoints.length > 0) {
      prev = this.state.wayPoints[this.state.wayPoints.length - 1]
      point.distance = pointDistance(prev, point, u)
    } else {
      point.distance = 0
    }
    console.log('point distance:', point.distance)
    if (!this.state.distance) {
      this.state.distance = point.distance
    } else {
      this.state.distance += point.distance
    }
    console.log('total distance:', this.state.distance)
    this.state.wayPoints.push(point)
  }

  printPoints() {
    console.log(this.state.wayPoints)
  }

  get geojson() {
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            id: null,
            date: this.state.date,
            name: this.state.name,
            location: this.state.location,
            startTime: this.state.startTime,
            endTime: this.state.endTime,
            duration: this.state.endTime - this.state.startTime,
            startPosition: this.state.startPosition,
            endPosition: this.state.endPosition,
            distance: this.state.distance,
          },
          geometry: {
            type: 'LineString',
            coordinates: this.state.wayPoints.map((w) => [w.longitude, w.latitude]),
          },
        },
      ],
    }
  }

  get() {
    return this.state
  }
}

export default State
