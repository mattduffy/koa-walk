class Subject {
  constructor() {
    this.observers = []
  }

  addObserver(o) {
    this.observers.push(o)
  }

  removeObserver(o) {
    const oIndex = this.observers.findIndex((obs) => o === obs)
    if (oIndex !== -1) {
      this.observers = this.observers.slice(oIndex, 1)
    }
  }

  notify(data) {
    if (this.observers.length > 0) {
      this.observers.forEach((o) => o.update(data))
    }
  }
}

export default Subject
