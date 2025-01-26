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
      date: new Date().valueOf(),
      name: null,
      startPosition: null,
      currentPosition: null,
      endPosition: null,
      wayPoints: [],
    }
  }

  update(data = {}) {
    this.state = Object.assign(this.state, data)
    this.notify(this.state)
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
