/*
 * file: public/j/State.js
 */
import Subject from './Subject.js'
import {
  pointDistance,
  // heading,
} from './Heading.js'

function normalizePosition(c) {
  // console.log('normalizePosition(c): ', c)
  if (c.constructor.name === 'GeolocationPosition') {
    console.log('normalizing GeoLocationPosition into smaller obj.')
    return {
      latitude: c.coords.latitude,
      longitude: c.coords.longitude,
      accuracy: c.coords.accuracy,
      altitude: c.coords.altitude,
      timestamp: c.timestamp,
      distance: c.distance ?? 0,
    }
  }
  return c
}
class State extends Subject {
  #MET = 7.5

  #VERBOSE

  #WATER_OUNCE = 1.043

  constructor(walkVersion, verbose = false) {
    super()
    this.#VERBOSE = verbose
    this.state = {
      VERSION: walkVersion ?? null,
      active: false,
      date: null,
      name: null,
      location: null,
      startTime: null,
      startPosition: null,
      currentPosition: null,
      endPosition: null,
      endTime: null,
      duration: null,
      distance: null,
      highestElevation: null,
      lowestElevation: null,
      changeInElevation: null,
      simpleCalories: null,
      pandolfCalories: null,
      weights: { body: null, ruck: 0, water: 0 },
      c: [],
      wayPoints: [],
      headings: [],
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

  /**
   * @summary The simplest calorie estimating function.  No account is given for
   * terrain type, gps factors (hill grading), uphill vs downhill efforts, etc.
   * MET - ratio of energy spent per unit time during a specific physical activity to a
   * reference value of 3.5 ml O₂/(kg·min).
   * Metabolic Equivalent Task (Hiking):
   *  MET = 7.5 (7.0 for backpacking or general weight lifting has a MET of 3.5)
   *  Calories Burned Per Minute: 𝐶𝑎𝑙𝑜𝑟𝑖𝑒𝑠/𝑚𝑖𝑛 = (MET * 3.5 * Weight in kg) / 200
   *  Ttl Calories Burned: 𝑇𝑜𝑡𝑎𝑙𝐶𝑎𝑙𝑜𝑟𝑖𝑒𝑠𝐵𝑢𝑟𝑛𝑒𝑑 = (MET * 3.5 * Weight in kg) / 200 * minutes
   * How to use:
   * Weight: Your body weight plus the weight of your ruck/pack.
   * Convert to kg if needed (1 lb≈0.4536 kg).
   * Duration: The total time spent hiking/rucking, in minutes.
   * @author Matthew Duffy <mattduffy@gmail.com>
   * @param Number minutes - Time spent expending energy, in minutes.
   * @param Object weights - Weight values for body, ruck, and water carried.
   * @param Number MET - The metabolic equivalent task number.
   * @return Number - Estimated calories used per duration of MET.
   */
  simpleCalories(minutes, weights = { body: 0, ruck: 0, water: 0 }, MET = this.#MET) {
    const COMBINED = weights.body + (weights.ruck ?? 0) + (weights.water ?? 0)
    const { duration } = this.state
    const timeDiff = Math.floor(Math.abs(this.state.endTime - this.state.startTime) / 60000)
    const cals = ((MET * 3.5 * COMBINED) / 200) * minutes
    if (this.#VERBOSE) {
      console.log('calculating simple EE method')
      console.log('body: ', weights.body, 'ruck: ', weights.ruck, 'h20: ', weights.water)
      console.log('combinded weights: ', COMBINED)
      console.log('MET', this.#MET)
      console.log('minutes', minutes)
      console.log(
        `endTime ${this.state.endTime} - startTime ${this.state.startTime} =`,
        this.state.endTime - this.state.startTime,
      )
      console.log('this.state.duration', duration)
      console.log('this.state.endTime - this.state.startTime', timeDiff)
      console.log(`((${MET} * 3.5 * ${COMBINED}) / 200) * ${minutes} = ${cals}`)
    }
    return cals
  }

  /*
   * @todo Provide implentation for Pandolf calorie estimate.
   */
  pandolfCalories() {
    return this.state.pandolfCalories
  }

  get totalElevationChange() {
    if (this.state.highestElevation && this.state.lowestElevation) {
      return this.state.highestElevation - this.state.lowestElevation
    }
    return null
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
      this.state.distance = x ?? 0
      // return x || 0
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

  set weights(w) {
    this.state.weights = w
  }

  get weights() {
    return this.state.weights
  }

  set bodyWeight(bw) {
    this.state.weights.bodyWeight = bw
  }

  get bodyWeight() {
    return this.state.weights.bodyWeight
  }

  set ruckWeight(rw) {
    this.state.weights.ruck = rw
  }

  get ruckWeight() {
    return this.state.weights.ruck
  }

  set waterWeight(ww) {
    this.state.weights.water = ww
  }

  get waterWeight() {
    return this.state.weights.water
  }

  set waterOunces(o) {
    this.state.weight.water = o * this.#WATER_OUNCE
  }

  get waterOunces() {
    return this.state.weight.water / this.#WATER_OUNCE
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
    // console.log('setCurrentPosition(c): ', c)
    this.state.currentPosition = normalizePosition(c)
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

  set version(v) {
    this.state.VERSION = v
  }

  get version() {
    return this.state.VERSION
  }

  prevPoint() {
    if (this.state.wayPoints.length > 0) {
      return this.state.wayPoints[this.state.wayPoints.length - 1]
    }
    return { distance: 0, heading: 0, altitude: null }
  }

  addPoint(p, u = 'metric', verbose = false) {
    // console.log('State::addPoint(p, u, verbose): ', p, u, verbose)
    if (/void/i.test(u)) {
      console.log(u)
    }
    const point = p
    let prev
    if (this.state.wayPoints.length > 0) {
      prev = this.state.wayPoints[this.state.wayPoints.length - 1]
      // point includes heading now, from GPS
      // point.heading = heading(prev, point, verbose)
      // point.distance = pointDistance(prev, point, u)
      // ATTENTION!! debugging distance issue:
      // no longer passing u (the display_units value) to pointDistance() function
      // because all data should be stored in original GPS metric units and only
      // converted to user_preference units when displayed.  pointDistance() function
      // sets default value for u = 'metric'
      point.distance = pointDistance(prev, point)
    } else {
      point.distance = 0
      point.heading = 0.0
      point.altitude = null
      this.state.highestElevation = point.altitude
      this.state.lowestElevation = point.altitude
    }
    if (point.altitude > this.state.highestElevation) {
      this.state.highestElevation = point.altitude
    }
    if (point.altitude < this.state.lowestElevation) {
      this.state.lowestElevation = point.altitude
    }
    if (!this.state.distance) {
      this.state.distance = point.distance
    } else {
      this.state.distance += point.distance
    }
    if (verbose) {
      console.log('point distance:', point.distance)
      console.log('total distance:', this.state.distance)
    }
    this.state.wayPoints.push(point)
  }

  printPoints() {
    console.dir(this.state.wayPoints)
  }

  get bearing() {
    if (this.state.wayPoints.length < 2) {
      return 0.0
    }
    const l = this.state.wayPoints.length - 1
    const p1 = this.state.wayPoints[l - 1]
    const p2 = this.state.wayPoints[l]
    console.log('State::bearing using p1, p2', p1, p2)
    // let bearing
    // if (p1.heading <= p2.heading) {
    //   console.log(`p1.heading (${p1.heading} <= p2.heading ${p2.heading}`)
    //   bearing = (p1.heading + p2.heading) % 360
    //   console.log(
    //    `(p1.heading (${p1.heading} + p2.heading ${p2.heading}) % 360 = bearing ${bearing}`
    //   )
    // } else {
    //   console.log(`p1.heading (${p1.heading} > p2.heading ${p2.heading}`)
    //   bearing = (p1.heading - p2.heading) % 360
    //   console.log(
    //    `(p1.heading $(p1.heading} - p2.heading ${p2.heading}) % 360 = bearing ${bearing}`
    //   )
    // }
    const bearing = p2.heading
    this.state.headings.push(bearing)
    return bearing
  }

  get lastHeading() {
    return this.state.wayPoints[this.state.wayPoints.length - 1].heading
  }

  get firstElevation() {
    return this.state.wayPoints[0].altitude
  }

  get lastElevation() {
    return this.state.wayPoints[this.state.wayPoints.length - 1].altitude
  }

  get lastPoint() {
    return this.state.wayPoints[this.state.wayPoints.length - 1]
  }

  get geojson() {
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            id: null,
            version: this.state.VERSION,
            date: this.state.date,
            name: this.state.name,
            location: this.state.location,
            startTime: this.state.startTime,
            endTime: this.state.endTime,
            duration: this.state.endTime - this.state.startTime,
            startPosition: this.state.startPosition,
            endPosition: this.state.endPosition,
            distance: this.state.distance,
            timestamps: this.state.wayPoints.map((w) => w.timestamp),
            highestElevation: this.state.highestElevation,
            lowestElevation: this.state.lowestElevation,
            changeInElevation: this.state.changeInElevation,
            simpleCalories: this.simpleCalories(
              Math.floor((Math.abs(this.state.endTime - this.state.startTime)) / 60000),
              this.state.weights,
            ),
            pandolfCalories: null,
            weights: this.state.weights,
          },
          geometry: {
            type: 'LineString',
            coordinates: this.state.wayPoints.map((w) => [
              w.longitude,
              w.latitude,
              w.heading ?? 0.0, // property unsanctioned by geojson spec (heading)
              w.altitude, // property unsanctioned by geojson spec (altitude)
              w.accuracy, // property unsanctioned by geojson spec (gps accuracy)
              w.timestamp, // property unsanctioned by geojson spec (waypoint timestamp)
            ]),
          },
        },
      ],
    }
  }

  get kmlTrack() {
    const fmt = { year: 'numeric', month: 'short', day: 'numeric' }
    const niceDate = new Date(this.state.date)
      .toLocaleString('en-US', fmt)
    const last = this.state.wayPoints.length - 1
    const kml = '<?xml version="1.0" encoding="UTF-8"?>'
+ `<kml xmlns="http://www.opengis.net/kml/2.2"
  xmlns:gx="http://www.google.com/kml/ext/2.2"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <Document>
    <atom:author>
      <atom:name>Matthew Duffy</atom:name>
    </atom:author>
    <atom:link href="http://walk.genevalakepiers.com" />
    <open>1</open>
    <name>${this.state.name} ${niceDate}</name>
    <visibility>1</visibility>
    <description>
      <![CDATA[
      <p>${this.state.name}</p>
      <p>${this.state.location}</p>
      <p>${niceDate}</h4>
      <p>Duration ${new Date(this.state.duration)
    .toISOString().slice(11, 19)}</p> 
      <p>Distance ${this.state.distance.toFixed(1)} meters</p>
      ]]>
    </description>
    <LookAt>
      <gx:TimeSpan>
        <begin>${new Date(this.state.startTime).toISOString()}</begin>
        <end>${new Date(this.state.endTime).toISOString()}</end>
      </gx:TimeSpan>
      <longitude>${this.state.geometry.coordinates[0][0]}</longitude>
      <latitude>${this.state.geometry.coordinates[0][1]}</latitude>
      <range>1300.000000</range> 
    </LookAt> 
    <Style id="check-hide-children">
      <ListStyle>
        <listItemType>check</listItemType>
      </ListStyle>
    </Style>
    <styleUrl>#check-hide-children</styleUrl>
    <Style id="myWalkStyle">
      <LineStyle>
        <color>ffD94F32</color>
        <width>6</width>
      </LineStyle>
      <IconStyle>
        <Icon>
          <href>http://maps.google.com/mapfiles/dir_0.png</href>
          <scale>1.0</scale>
        </Icon>
      </IconStyle>
    </Style>
    <Placemark>
      <name>Start</name>
      <Style id="grn-pushpin">
        <IconStyle>
          <Icon>
            <href>http://maps.google.com/mapfiles/kml/pushpin/grn-pushpin.png</href>
            <scale>1.0</scale>
          </Icon>
        </IconStyle>
      </Style>
      <styleUrl>#grn-pushpin</styleUrl>
      <description><![CDATA[
        <p>Start time: ${new Date(this.state.startTime)
    .toISOString().slice(11, 19)}</p>
        <p>
          Start location:<br>
          longitude ${this.state.wayPoints[0].longitude}<br>
          latitude  ${this.state.wayPoints[0].latitude}
        </p>
        ]]>
      </description>
      <Point>
        <coordinates>
          ${this.state.wayPoints[0].longitude},${this.state.wayPoints[0].latitude},0
        </coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Finish</name>
      <Style id="ylw-pushpin">
        <IconStyle>
          <Icon>
            <href>http://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png</href>
            <scale>1.0</scale>
          </Icon>
        </IconStyle>
      </Style>
      <styleUrl>#ylw-pushpin</styleUrl>
      <description>
        <![CDATA[<p>Finish time: ${new Date(this.state.endTime)
    .toISOString().slice(11, 19)}</p>
        <p>
          Finish location: <br>
          longitude ${this.state.wayPoints[last].longitude}<br>
          latitude  ${this.state.wayPoints[last].latitude}
        </p>]]>
      </description>
      <Point>
        <coordinates>
          ${this.state.wayPoints[last].longitude},${this.state.wayPoints[last].latitude},0
        </coordinates>
      </Point>
    </Placemark>
    <Placemark> 
      <styleUrl>#myWalkStyle</styleUrl> 
      <name>walk route</name>
      <description>
        <![CDATA[<p>${this.name}</p>
        <p>${this.location}</p>
        <p>${niceDate}</p>
        <p>Duration ${new Date(this.duration)
    .toISOString().slice(11, 19)}</p> 
        <p>Distance ${this.distance.toFixed(1)} meters</p>]]>
      </description>
      <gx:Track id="theWalk">
        <altitudeMode>clampToGround</altitudeMode>
        ${this.state.wayPoints.map((w) => {
    console.log()
    return `<when>${new Date(w.timestamp).toISOString()}</when>`
  }).join('\n')}
        ${this.state.wayPoints.map((w) => {
    console.log()
    return `<gx:coord>${w[0]} ${w[1]} 0</gx:coord>`
  }).join('\n')}
      </gx:Track> 
    </Placemark>
  </Document>
</kml>
`
    return kml
  }

  get kmlLineString() {
    const fmt = { year: 'numeric', month: 'short', day: 'numeric' }
    const niceDate = new Date(this.state.date)
      .toLocaleString('en-US', fmt)
    const last = this.state.wayPoints.length - 1
    const kml = '<?xml version="1.0" encoding="UTF-8"?>'
+ `<kml xmlns="http://www.opengis.net/kml/2.2"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <Document>
    <atom:author>
      <atom:name>Matthew Duffy</atom:name>
    </atom:author>
    <atom:link href="http://walk.genevalakepiers.com" />
    <open>1</open>
    <Style id="myWalkStyle">
      <LineStyle id="walk">
        <color>ffD94F32</color>
        <width>5.0</width>
      </LineStyle>
    </Style>
    <Style id="grn-pushpin">
      <IconStyle id="mygrnpushpin">
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/pushpin/grn-pushpin.png</href>
          <scale>1.0</scale>
        </Icon>
      </IconStyle>
    </Style>
    <Style id="ylw-pushpin">
      <IconStyle id="myylwpushpin">
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png</href>
          <scale>1.0</scale>
        </Icon>
      </IconStyle>
    </Style>
    <Placemark>
      <name>${this.state.name} walk</name>
      <styleUrl>#myWalkStyle</styleUrl> 
      <visibility>1</visibility>
      <description><![CDATA[
        <h3>${this.state.name}</h3>
        <h4>${this.state.location}</h4>
        <h4>${niceDate}</h4>
        <p>Duration ${new Date(this.state.duration)
    .toISOString().slice(11, 19)}</p> 
        <p>Distance ${this.state.distance.toFixed(1)} meters</p>
      ]]></description>
      <LookAt>
        <longitude>${this.state.wayPoints[0].longitude}</longitude>
        <latitude>${this.state.wayPoints[0].latitude}</latitude>
        <altitude>100</altitude>
        <heading>0</heading>
        <tilt>0</tilt>
        <range>1000.</range>
      </LookAt>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>
          ${this.state.wayPoints.map((w) => {
    console.log()
    return `${w.longitude}, ${w.latitude},0`
  }).join('\n')}
        </coordinates>
      </LineString>
    </Placemark>
    <Placemark>
      <name>Start</name>
      <description><![CDATA[
        <p>Start time: ${new Date(this.state.startTime)
    .toISOString().slice(11, 19)}</p>
        <p>
          Start location: <br>
          longitude ${this.state.wayPoints[0].longitude}<br>
          latitude  ${this.state.wayPoints[0].latitude}
        </p>
        ]]>
      </description>
      <Style id="grn-pushpin">
        <IconStyle id="mygrnpushpin">
          <Icon>
            <href>http://maps.google.com/mapfiles/kml/pushpin/grn-pushpin.png</href>
            <scale>1.0</scale>
          </Icon>
        </IconStyle>
      </Style>
      <Point>
        <coordinates>
          ${this.state.wayPoints[0].longitude},${this.state.wayPoints[0].latitude},0
        </coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Finish</name>
      <description><![CDATA[
        <p>Finish time: ${new Date(this.state.endTime)
    .toISOString().slice(11, 19)}</p>
        <p>
          Finish location:<br>
          longitude ${this.state.wayPoints[last].longitude}<br>
          latitude  ${this.state.wayPoints[last].latitude}
        </p>
        ]]></description>
      <Style id="ylw-pushpin">
        <IconStyle id="myylwpushpin">
          <Icon>
            <href>http://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png</href>
            <scale>1.0</scale>
          </Icon>
        </IconStyle>
      </Style>
      <Point>
        <coordinates>
          ${this.state.wayPoints[last].longitude},${this.state.wayPoints[last].latitude},0
        </coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>
`
    return kml
  }

  get() {
    return this.state
  }
}

export default State
