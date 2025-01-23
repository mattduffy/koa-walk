import Subject from './Subject.js'

class State extends Subject {
  constructor() {
    super()
    this.state = { active: false }
  }

  update(data = {}) {
    this.state = Object.assign(this.state, data)
    // this.state = { ...this.state, ...data }
    this.notify(this.state)
  }

  getCurrentPosition() {
    return this.state.currentPosition
  }

  setCurrentPosition(c = {}) {
    console.log('setting current position to: ', c)
    console.log('c.contructor.name === ', c.constructor.name)
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
    if (!this.state?.wayPoints) {
      this.state.wayPoints = []
    }
    this.state.wayPoints.push(point)
  }

  printPoints() {
    console.log(this.state.wapPoints)
  }

  get() {
    return this.state
  }
}

export default State
