import Subject from './Subject.js'

class State extends Subject {
  constructor() {
    super()
    this.state = {}
  }

  update(data = {}) {
    this.state = Object.assign(this.state, data)
    // this.state = { ...this.state, ...data }
    this.notify(this.state)
  }

  addPoint(point) {
    if (!this.state?.wayPoints) {
      this.state.wayPoints = []
    }
    this.state.wayPoints.push(point)
  }

  get() {
    return this.state
  }
}

export default State
