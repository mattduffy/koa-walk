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
    console.dir(this.state.wayPoints)
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
            timestamps: this.state.wayPoints.map((w) => w.timestamp),
          },
          geometry: {
            type: 'LineString',
            coordinates: this.state.wayPoints.map((w) => [w.longitude, w.latitude]),
          },
        },
      ],
    }
  }

  get kmlTrack() {
    const fmt = {year: 'numeric', month: 'short', day: 'numeric'}
    const niceDate = new Date(this.state.date)
      .toLocaleString('en-US', fmt)
    const last = this.state.wayPoints.length - 1
    let kml = 
`<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"
  xmlns:gx="http://www.google.com/kml/ext/2.2"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <Document>
    <atom:author>
      <atom:name>Matthew Duffy</atom:name>
    </atom:author>
    <atom:link href="http://walk.genevalakepiers.com" />
    <open>1</open>
    <name>${this.state.name} walk</name>
    <visibility>1</visibility>
    <description>
      <![CDATA[<h3>${this.state.name}</h3>
      <h4>${this.state.location}</h4>
      <h4>${niceDate}</h4>
      <p>Duration ${new Date(this.state.duration)
          .toISOString().slice(11, 19)}</p> 
      <p>Distance ${this.state.distance.toFixed(1)} meters</p>]]>
    </description>
    <LookAt>
      <gx:TimeSpan>
        <begin>${new Date(this.state.startTime).toISOString()}</begin>
        <end>${new Date(this.state.endTime).toISOString()}</end>
      </gx:TimeSpan>
      <longitude>${this.state.wayPoints[0].longitude}</longitude>
      <latitude>${this.state.wayPoints[0].latitude}</latitude>
      <range>1300.000000</range> 
    </LookAt> 
    <Style id="check-hide-children">
      <ListStyle>
        <listItemType>checkHideChildren</listItemType>
      </ListStyle>
    </Style>
    <styleUrl>#check-hide-children</styleUrl>
    <Style id="lineStyle">
      <LineStyle>
        <color>ffD94F32</color>
        <width>6</width>
      </LineStyle>
    </Style>
    <Folder>
      <name>Track</name>
      <Placemark> 
        <name>${new Date(this.state.date).toISOString()}</name>
        <gx:Track id="theWalk">
          <altitudeMode>clampToGround</altitudeMode>
          ${this.state.wayPoints.map((w) => {
            return '<when>' + new Date(w.timestamp).toISOString() + '</when>'
          }).join('\n')}
          ${this.state.wayPoints.map((w) => {
            return '<gx:coord>'
              + w[0] + ' '
              + w[1] + ' '
              + '0'
              + '</gx:coord>'
          }).join('\n')}
        </gx:Track> 
      </Placemark>
    </Folder>
  </Document>
</kml>
`
    return kml
  }

  get kmlLineString() {
    const fmt = {year: 'numeric', month: 'short', day: 'numeric'}
    const niceDate = new Date(this.state.date)
      .toLocaleString('en-US', fmt)
    const last = this.state.wayPoints.length - 1
    let kml = 
`<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"
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
            return w.longitude + ',' + w.latitude + ',0'
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
