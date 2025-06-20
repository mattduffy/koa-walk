/*
 * file: public/j/State.js
 */
import Subject from './Subject.js'
import { pointDistance, heading } from './Heading.js'

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
      duration: null,
      distance: null,
      highestElevation: null,
      lowestElevation: null,
      changeInElevation: null,
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

  get totalElevationChange() {
    if (highestElevation && lowestElevation) {
      return highestElevation - lowestElevation
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
    // console.log('current position is now: ', this.state.currentPosition)
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

  addPoint(p, u = 'metric', verbose = false) {
    console.log('State::addPoint(p, u, verbose): ', p, u, verbose)
    const point = p
    let prev
    if (this.state.wayPoints.length > 0) {
      prev = this.state.wayPoints[this.state.wayPoints.length - 1]
      // point includes heading now, from GPS 
      // point.heading = heading(prev, point, verbose)
      point.distance = pointDistance(prev, point, u)
    } else {
      point.distance = 0
      point.heading = 0.0
      point.altitude = null
    }
    if (point.altitude > this.state.highestElevation) {
      this.state.highestElevation = point.altitude
    }
    if (point.altitude < this.state.lowestElevation) {
      this.state.lowestElevation = point.altitude
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

  get bearing() {
    if (this.state.wayPoints.length < 2) {
      return 0.0
    }
    const l = this.state.wayPoints.length - 1
    const p1 = this.state.wayPoints[l - 1]
    const p2 = this.state.wayPoints[l]
    console.log('State::bearing using p1, p2', p1, p2)
    let bearing
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
    bearing = p2.heading
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
          },
          geometry: {
            type: 'LineString',
            coordinates: this.state.wayPoints.map((w) => [
              w.longitude,
              w.latitude,
              w.heading ?? 0.0, // property unsanctioned by geojson spec (heading)
              w.altitude,       // property unscantioned by geojson spec (altitude)
            ]),
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
    <name>${this.state.name} ${shortDate}</name>
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
        <![CDATA[<p>${walk.features[0].properties.name}</p>
        <p>${walk.features[0].properties.location}</p>
        <p>${niceDate}</p>
        <p>Duration ${new Date(walk.features[0].properties.duration)
            .toISOString().slice(11, 19)}</p> 
        <p>Distance ${walk.features[0].properties.distance.toFixed(1)} meters</p>]]>
      </description>
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
