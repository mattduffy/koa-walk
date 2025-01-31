import Subject from './Subject.js'

function normalizePosition(c) {
  console.log('normalizePosition(c): ', c)
  if (c.constructor.name === 'GeolocationPosition') {
    console.log('normalizing GeoLocationPosition into smaller obj.')
    return {
      latitude: c.coords.latitude,
      longitude: c.coords.longitude,
      accuracy: c.coords.accuracy,
      timestamp: c.timestamp,
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
      startTime: null,
      startPosition: null,
      currentPosition: null,
      endPosition: null,
      endTime: null,
      wayPoints: [],
      c: [],
      duration: null,
    }
  }

  update(data = {}) {
    this.state = Object.assign(this.state, data)
    this.notify(this.state)
  }

  get duration() {
    return this.state.duration
  }

  set duration(d) {
    if (d) {
      this.state.duration = this.state.endTime - this.state.startTime
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

  addPoint(point) {
    console.log('addPoint(p): ', point)
    this.state.wayPoints.push(point)
  }

  printPoints() {
    console.log(this.state.wayPoints)
  }

  get() {
    return this.state
  }
}

export default State
