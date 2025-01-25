import Subject from './Subject.js'

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

  set startPosition(c) {
    this.state.startPosition = c
  }

  get startPosition() {
    return this.state.startPosition
  }

  set currentPosition(c) {
    this.state.currentPosition = c
  }

  get currentPosition() {
    return this.state.currentPosition
  }

  set endPosition(c) {
    this.state.endPosition = c
  }

  get endPosition() {
    return this.state.endPosition
  }

  getCurrentPosition() {
    return this.state.currentPosition
  }

  setCurrentPosition(c = {}) {
    console.log('setCurrentPosition(c): ', c)
    if (c.constructor.name === 'GeolocationPosition') {
      console.log('normalizing GeoLocationPosition into smaller obj.')
      this.state.currentPosition = {
        latitude: c.coords.latitude,
        longitude: c.coords.longitude,
        accuracy: c.coords.accuracy,
        timestamp: c.timestamp,
      }
    } else {
      this.state.currentPosition = c
    }
    console.log('current position is now: ', this.state.currentPosition)
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
