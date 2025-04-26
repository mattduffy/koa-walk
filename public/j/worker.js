/*
 * file: public/j/worker.js
 */
/* eslint-env worker */
/* global self */
// import Observer from './Observer.js'
import State from './State.js'
import { heading, pointDistance } from './Heading.js'
import { ObjectId } from './lib/bson.mjs'

const worker = self
const IDB_OBJ_VER = 1
const DBNAME = 'walks'
const OBJSTORENAME = 'walk'
let db
function openDB() {
  let DBOpenRequest = worker.indexedDB.open(DBNAME, IDB_OBJ_VER)
  DBOpenRequest.onupgradeneeded = (e) => {
    const db = e.target.result
    const objectStore = db.createObjectStore(OBJSTORENAME, { keyPath: '_id' })
    objectStore.createIndex('dateIdx', 'date', { unique: false })
    objectStore.createIndex('nameIdx', 'name', { unique: false })
  }
  DBOpenRequest.onsuccess = (e) => {
    console.log(e)
    setTimeout(() => {
      console.log('waiting .1 second')
    }, 100)
    // db = e.target.result
    db = DBOpenRequest.result
  }
  DBOpenRequest.onerror = (e) => {
    console.info(e)
  }
  return db
}
openDB()
let walkState
if (walkState === undefined) {
  walkState = new State()
}
console.log('worker state: ', walkState)

let isLoggedIn = false
let user = null

async function setPref(credentials) {
  console.log('setPref(credentials): ', user)
  let response
  let json
  const formData = new FormData()
  formData.append('csrfTokenHidden', credentials.csrfTokenHidden)
  if (credentials?.units) {
    formData.append('units', credentials.units)
  }
  if (credentials?.orientation) {
    formData.append('orientation', credentials.orientation)
  }// formData.append('userId', user.userId)
  const opts = {
    method: 'POST',
    headeers: {
      Accept: 'application/json',
      Authorization: `Bearer ${credentials.jwtAccess}`,
      'X-ASYNCREQUEST': true,
    },
    body: formData,
  }
  const request = new Request(credentials.url, opts)
  try {
    response = await fetch(request)
    console.log(response)
    json = await response.json()
    if (credentials?.units) {
      json.newUnits = credentials.units
    } else if (credentials?.orientation) {
      json.newOrientation = credentials.orientation
    }
    console.log('setPref response: ', json)
  } catch (e) {
    console.error(e)
  }
  return json
}
async function deleteWalk(credentials) {
  console.log('worker::deleteWalk(credentials)', credentials)
  let response
  let json
  const deleted = { status: null, msg: null }
  // if (!isLoggedIn) {
  if (credentials.scope === 'local') {
    return await new Promise((resolve, reject) => {
      console.log(`deleting local walk id ${credentials.id}`)
      const transaction = db.transaction(OBJSTORENAME, 'readwrite')
      const store = transaction.objectStore(OBJSTORENAME)
      console.log('store', store)
      let request = store.delete(credentials.id)
      request.onerror = (e) => {
        console.log(`rejecting store.delete(${credentials.id})`)
        deleted.status = 'failed'
        deleted.msg = `rejecting store.delete(${credentials.id})` 
        deleted.error = e
        reject(deleted)
      }
      request.onsuccess = (e) => {
        deleted.status = 'ok'
        deleted.msg = `walk id ${credentials.id} deleted from the database.`
        deleted.res = json
        deleted.id = credentials.id
        deleted.newCsrfToken = credentials.csrfTokenHidden
        deleted.scope = 'local'
        if (e.target.result !== undefined) {
          deleted.status = 'failed'
          deleted.msg = `rejecting store.delete(${credentials.id})`
          console.log(e.target)
          reject()
        } else {
          resolve(deleted)
        }
      }
      transaction.oncomplete = (e) => {
        console.log('transaction complete', e)
        console.log(deleted)
      }
    })
  } else {
    const formData = new FormData()
    formData.append('csrfTokenHidden', credentials.csrfTokenHidden)
    formData.append('toBeDeleted', credentials.id)
    const opts = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer: ${credentials.jwtAccess}`,
        'X-ASYNCREQUEST': true,
      },
      body: formData,
    }
    const request = new Request(credentials.url, opts)
    try {
      response = await fetch(request)
      json = await response.json()
      console.log(json)
      deleted.status = 'ok'
      deleted.msg = `walk id ${credentials.id} deleted from the database.`
      deleted.res = json
      deleted.id = credentials.id
      deleted.newCsrfToken = json.newCsrfToken
      deleted.scope = 'remote'
    } catch (e) {
      console.log(e)
      deleted.status = 'failed'
      deleted.msg = 'Failed to delete walk from the database for some reason.'
    }
  }
  console.log(deleted)
  return deleted
}
async function saveWalk(credentials) {
  console.log('worker::saveWalk(credentials)', credentials)
  let response
  let json
  const saved = { status: null, msg: null }
  if (credentials.scope === 'local') {
    const _id = new ObjectId().toString()
    console.log('new ObjectId()', _id)
    const walk = walkState.geojson
    walk._id = _id
    walk.date = walk.features[0].properties.date
    walk.name = walk.features[0].properties.name
    console.log('db handle opened', db)
    return new Promise((resolve, reject) => {
      console.log('before transaction', db)
      const transaction = db.transaction(OBJSTORENAME, 'readwrite')
      console.log('transaction', transaction)
      const store = transaction.objectStore(OBJSTORENAME)
      console.log('store', store)
      let request = store.add(walk)
      request.onerror = (e) => {
        console.log('rejecting store.add request', e)
        reject(e)
      }
      request.onsuccess = (e) => {
        console.log('put result', request)
        saved.status = 'ok'
        saved.msg = 'Saved walk to device local storage.'
        saved.res = { saved: { insertedId: _id } }
        saved.scope = 'local'
        saved.newCsrfToken = credentials.csrfTokenHidden
        console.log('local idb saved', saved)
        resolve(saved)
      }
      transaction.oncomplete = (e) => {
        console.log('tranaction complete', e)
        console.log(saved)
      }
    })
  } else {
    const formData = new FormData()
    formData.append('csrfTokenHidden', credentials.csrfTokenHidden)
    formData.append('walk', JSON.stringify(walkState.geojson))
    const opts = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer: ${credentials.jwtAccess}`,
        'X-ASYNCREQUEST': true,
      },
      body: formData,
    }
    const request = new Request(credentials.url, opts)
    try {
      response = await fetch(request)
      json = await response.json()
      console.log(json)
      if (json.saved.acknowledged === true && json.saved.insertedId) {
        console.log('new walk _id:', json.saved.insertedId)
      }
      saved.status = 'ok'
      saved.msg = 'Saved walk.'
      saved.res = json
      saved.scope = 'remote'
      console.log('what happened to saved?', saved)
      return saved
    } catch (e) {
      console.log('worker::save::fetch failed')
      console.log(e)
      saved.status = 'failed'
      saved.msg = 'Failed to save walk to database for some reason.'
      console.log('what happened to saved?', saved)
      return saved
    }
  }
}
async function exportKML(credentials) {
  console.log('worker::exportKML(credentials)', credentials)
  let response
  let kml
  let walk
  let newCsrfToken
  if (credentials.scope === 'local') {
    console.log(`getting local walk id ${credentials.id}`)
    walk = await new Promise((resolve, reject) => {
      console.log('db handle opened?', db)
      const transaction = db.transaction(OBJSTORENAME, 'readonly')
      const store = transaction.objectStore(OBJSTORENAME)
      console.log('store', store)
      let request = store.get(credentials.id)
      request.onerror = (e) => {
        console.log(`rejecting store.get(${credentials.id})`, e)
        reject({ status: 'failed', msg: 'failed to get walk from idb' })
      }
      request.onsuccess = (e) => {
        console.log(`store.get(${credentials.id})`, e.target)
        console.log('request.result', e.target.result)
        const _walk = e.target.result ?? {}
        _walk.scope = credentials.scope
        _walk.msg = 'Walk retrieved fom local device.'
        _walk.status = 'ok'
        _walk.newCsrfToken = credentials.csrfTokenHidden
        console.log('about to resolve local walk', _walk)
        resolve(_walk)
      }
      transaction.oncomplete = (e) => {
        console.log('transaction complete', e)
        // console.log(walk)
      } 
    })
  } else {
    const formData = new FormData()
    formData.append('csrfTokenHidden', credentials.csrfTokenHidden)
    formData.append('walkId', credentials.id)
    const opts = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${credentials.jwtAccess}`,
        'X-ASYNCREQUEST': true,
      },
      body: formData,
    }
    const request = new Request(credentials.url, opts)
    try {
      response = await fetch(request)
      const json = await response.json()
      console.log('showWalk response:', json)
      walk = json.walk
      newCsrfToken = json.newCsrfToken
    } catch (e) {
      console.error(e)
      walk = { status: 'failed', msg: 'failed to retrieve walk from db', e }
    }
  }
  if (walk.features[0].properties?.timestamps) {
    kml = kmlTrack(walk)
  } else {
    kml = kmlLineString(walk)
  }
  console.log('kml', kml)
  const fmt = {year: 'numeric', month: 'short', day: 'numeric'}
  const niceDate = new Date(walk.features[0].properties.date)
    .toLocaleString('en-US', fmt)
  let _name = `${walk.features[0].properties.name} ${niceDate}`
  _name = _name.replace(/ /g, '-').replace(/,/g, '')
  return { kml, filename:`${_name}.kml`, newCsrfToken }
}

function kmlTrack(walk) {
  const fmt = {year: 'numeric', month: 'short', day: 'numeric'}
  const niceDate = new Date(walk.features[0].properties.date)
    .toLocaleString('en-US', fmt)
  const shortDate = new Date(walk.features[0].properties.date)
    .toLocaleString('en-US', {year: 'numeric', month: '2-digit', day: 'numeric'})
  const last = walk.features[0].geometry.coordinates.length - 1
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"
  xmlns:gx="http://www.google.com/kml/ext/2.2"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <Document>
    <atom:author>
      <atom:name>Matthew Duffy</atom:name>
    </atom:author>
    <atom:link href="http://walk.genevalakepiers.com" />
    <open>1</open>
    <name>${walk.features[0].properties.name} ${shortDate}</name>
    <visibility>1</visibility>
    <description>
      <![CDATA[
      <p>${walk.features[0].properties.name}</p>
      <p>${walk.features[0].properties.location}</p>
      <p>${niceDate}</p>
      <p>Duration ${new Date(walk.features[0].properties.duration)
          .toISOString().slice(11, 19)}</p> 
      <p>Distance ${walk.features[0].properties.distance.toFixed(1)} meters</p>
      ]]>
    </description>
    <LookAt>
      <gx:TimeSpan>
        <begin>${new Date(walk.features[0].properties.startTime).toISOString()}</begin>
        <end>${new Date(walk.features[0].properties.endTime).toISOString()}</end>
      </gx:TimeSpan>
      <longitude>${walk.features[0].geometry.coordinates[0][0]}</longitude>
      <latitude>${walk.features[0].geometry.coordinates[0][1]}</latitude>
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
        <p>Start time: ${new Date(walk.features[0].properties.startTime)
        .toISOString().slice(11, 19)}</p>
        <p>
          Start location:<br>
          longitude ${walk.features[0].geometry.coordinates[0][0]}<br>
          latitude  ${walk.features[0].geometry.coordinates[0][1]}
        </p>
        ]]>
      </description>
      <Point>
        <coordinates>
          ${walk.features[0].geometry.coordinates[0][0]},${walk.features[0].geometry.coordinates[0][1]},0
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
        <![CDATA[<p>Finish time: ${new Date(walk.features[0].properties.endTime)
        .toISOString().slice(11, 19)}</p>
        <p>
          Finish location: <br>
          longitude ${walk.features[0].geometry.coordinates[last][0]}<br>
          latitude  ${walk.features[0].geometry.coordinates[last][1]}
        </p>]]>
      </description>
      <Point>
        <coordinates>
          ${walk.features[0].geometry.coordinates[last][0]},${walk.features[0].geometry.coordinates[last][1]},0
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
        ${walk.features[0].properties.timestamps.map((t) => {
          return '<when>' + new Date(t).toISOString() + '</when>'
        }).join('\n')}
        ${walk.features[0].geometry.coordinates.map((w) => {
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
`}

function kmlLineString(walk) {
  console.log('kmlLineString(walk)', walk)
  const fmt = {year: 'numeric', month: 'short', day: 'numeric'}
  const niceDate = new Date(walk.features[0].properties.date)
    .toLocaleString('en-US', fmt)
  const shortDate = new Date(walk.features[0].properties.date)
    .toLocaleString('en-US', {year: 'numeric', month: '2-digit', day: 'numeric'})
  const last = walk.features[0].geometry.coordinates.length - 1
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"
  xmlns:gx="http://www.google.com/kml/ext/2.2"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <Document>
    <atom:author>
      <atom:name>Matthew Duffy</atom:name>
    </atom:author>
    <atom:link href="http://walk.genevalakepiers.com" />
    <open>1</open>
    <visibility>1</visibility>
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
      <name>${walk.features[0].properties.name} ${shortDate}</name>
      <styleUrl>#myWalkStyle</styleUrl> 
      <description>
        <![CDATA[<h3>${walk.features[0].properties.name}</h3>
        <h4>${walk.features[0].properties.location}</h4>
        <h4>${niceDate}</h4>
        <p>Duration ${new Date(walk.features[0].properties.duration)
            .toISOString().slice(11, 19)}</p> 
        <p>Distance ${walk.features[0].properties.distance.toFixed(1)} meters</p>]]>
      </description>
      <LookAt>
        <longitude>${walk.features[0].geometry.coordinates[0][0]}</longitude>
        <latitude>${walk.features[0].geometry.coordinates[0][1]}</latitude>
        <altitude>100</altitude>
        <heading>0</heading>
        <tilt>0</tilt>
        <range>1000.</range>
      </LookAt>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>
          ${walk.features[0].geometry.coordinates.map((c) => {
            return c[0] + ',' + c[1] + ',0'
          }).join('\n')}
        </coordinates>
      </LineString>
    </Placemark>
    <Placemark>
      <name>Start</name>
      <description><![CDATA[
        <p>Start time: ${new Date(walk.features[0].properties.startTime)
        .toISOString().slice(11, 19)}</p>
        <p>
          Start location:<br>
          longitude ${walk.features[0].geometry.coordinates[0][0]}<br>
          latitude  ${walk.features[0].geometry.coordinates[0][1]}
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
          ${walk.features[0].geometry.coordinates[0][0]},${walk.features[0].geometry.coordinates[0][1]},0
        </coordinates>
      </Point>
    </Placemark>
    <Placemark>
      <name>Finish</name>
      <description><![CDATA[
        <p>Finish time: ${new Date(walk.features[0].properties.endTime)
        .toISOString().slice(11, 19)}</p>
        <p>
          Finish location: <br>
          longitude ${walk.features[0].geometry.coordinates[last][0]}<br>
          latitude  ${walk.features[0].geometry.coordinates[last][1]}
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
          ${walk.features[0].geometry.coordinates[last][0]},${walk.features[0].geometry.coordinates[last][1]},0
        </coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>
`
}

async function showWalk(credentials) {
  console.log('woker::showWalk(credentials)', credentials)
  let response
  let walk
  let auth
  if (credentials.scope === 'local') {
    console.log(`getting local walk id ${credentials.id}`)
    walk = {}
    auth = 'no'
    return await new Promise((resolve, reject) => {
      console.log('db handle opened?', db)
      const transaction = db.transaction(OBJSTORENAME, 'readonly')
      const store = transaction.objectStore(OBJSTORENAME)
      console.log('store', store)
      let request = store.get(credentials.id)
      request.onerror = (e) => {
        console.log(`rejecting store.get(${credentials.id})`, e)
        reject({ status: 'failed', msg: 'failed to get walk from idb' })
      }
      request.onsuccess = (e) => {
        console.log(`store.get(${credentials.id})`, e.target)
        console.log('request.result', e.target.result)
        walk.walk = e.target.result ?? {}
        walk.scope = credentials.scope
        walk.msg = 'Walk retrieved fom local device.'
        walk.status = 'ok'
        walk.newCsrfToken = credentials.csrfTokenHidden
        walk.auth = auth
        walk.test = 'request.onsuccess'
        console.log('about to resolve local walk', walk)
        resolve(walk)
      }
      transaction.oncomplete = (e) => {
        walk.test = 'transaction.oncomplete'
        console.log('transaction complete', e)
        console.log(walk)
        // resolve(walk)
      } 
    })
  }
  const formData = new FormData()
  formData.append('csrfTokenHidden', credentials.csrfTokenHidden)
  formData.append('walkId', credentials.id)
  const opts = {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${credentials.jwtAccess}`,
      'X-ASYNCREQUEST': true,
    },
    body: formData,
  }
  const request = new Request(credentials.url, opts)
  try {
    response = await fetch(request)
    const json = await response.json()
    console.log('showWalk response:', json)
    walk = json
    walk.newCsrfToken = json.newCsrfToken
  } catch (e) {
    console.error(e)
    walk = { status: 'failed', msg: 'failed to retrieve walk from db', e }
  }
  return walk
}
async function getList(credentials) {
  console.log('woker::getList')
  let response
  let list = { remoteList: null, localList: null, auth: null }
  let auth
  console.log('is logged in: ', isLoggedIn)
  console.log('user: ', user)
  console.log('list request scope', credentials.scope)
  if (credentials.scope === 'local' || credentials.scope === 'both') {
    auth = 'no'
    await new Promise((resolve, reject) => {
      console.log('db handle opened?', db)
      const transaction = db.transaction(OBJSTORENAME, 'readonly')
      const store = transaction.objectStore(OBJSTORENAME)
      let dateIdx = store.index('dateIdx')
      console.log('dateIdx', dateIdx)
      let request = dateIdx.getAll()
      request.onerror = (e) => {
        console.log('rejecting store.getAll() result', e)
        reject(e)
      }
      request.onsuccess = (e) => {
        console.log('store.getAll()', e.target)
        console.log('request.result', e.target.result)
        list.localList = e.target.result.reverse() ?? []
        list.scope = credentials.scope
        list.msg = 'All walks saved to local device.'
        list.status = 'ok'
        list.newCsrfToken = credentials.csrfTokenHidden
        list.auth = auth
        console.log('about to resolve local list', list)
        resolve(list)
      }
      transaction.oncomplete = (e) => {
        console.log('transaction complete', e)
        console.log(list)
        resolve(list)
      }
    })
    if (!isLoggedIn) {
      console.log('getList not logged in, returning store.getAll().result')
      return list
    }
  }
  if (credentials.scope !== 'local') {
    const formData = new FormData()
    formData.append('csrfTokenHidden', credentials.csrfTokenHidden)
    formData.append('userEmail', user.email)
    const opts = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${credentials.jwtAccess}`,
        'X-ASYNCREQUEST': true,
      },
      body: formData,
    }
    const request = new Request(credentials.url, opts)
    auth = 'yes'
    try {
      response = await fetch(request)
      console.log(response)
      const json = await response.json()
      console.log('getList response: ', json)
      list.remoteList = json.list
      list.auth = auth
      list.newCsrfToken = json.newCsrfToken
    } catch (e) {
      console.error(e)
      list.remoteList = []
      list.localList = []
      list.auth = auth
      list.error = e
    }
  }
  console.log('about to return final list', list)
  return list
}
async function refresh(o) {
  console.log('worker::refresh(o) ', o)
  const formData = new FormData()
  formData.append('jwtAccess', o.jwtAccess)
  formData.append('csrfTokenHidden', o.csrfTokenHidden)
  const opts = {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${o.jwtAccess}`,
      'X-ASYNCREQUEST': true,
    },
    body: formData,
  }
  const request = new Request(o.url, opts)
  let response
  let _user
  try {
    response = await fetch(request)
    _user = await response.json()
  } catch (e) {
    console.error('failed to refresh user.')
    console.error(e)
  }
  isLoggedIn = true
  user = _user
  console.log('refreshed isLoggedIn: ', isLoggedIn)
  console.log('refreshed user: %o', user)
  return user
}
async function login(credentials) {
  console.log('worker::login(credentials): ', credentials)
  const formData = new FormData()
  formData.append('csrfTokenHidden', credentials.csrfTokenHidden)
  formData.append('username', credentials.email)
  formData.append('password', credentials.password)
  formData.append('jwtAccess', credentials.jwtAccess)
  const opts = {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${credentials.jwtAccess}`,
      'X-ASYNCREQUEST': true,
    },
    body: formData,
  }
  const request = new Request(credentials.url, opts)
  let response
  let _user
  try {
    response = await fetch(request)
    _user = await response.json()
    console.log(_user)
    if (!/failed/i.test(_user.status)) {
      isLoggedIn = true
      console.log('worker::login - success: ', _user)
    } else {
      console.log('worker::login - failed : ', _user)
      return { TASK: 'LOGIN', login: 'failed', user: null, cause: _user, newCsrfToken: _user.newCsrfToken }
    }
  } catch (e) {
    console.error(e)
    return { TASK: 'LOGIN', login: 'failed', cause: e }
  }
  user = _user
  console.log('is logged in: ', isLoggedIn)
  console.log('user: ', user)
  return { TASK: 'LOGIN', user: _user, cause: { status: null } }
}

async function logout(data) {
  const opts = {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${data.jwtAccess}`,
      'X-ASYNCREQUEST': true,
    },
  }
  const request = new Request(data.url, opts)
  let response
  let json
  try {
    response = await fetch(request)
    json = await response.json()
  } catch (e) {
    return { TASK: 'LOGOUT', logout: 'failed', cause: e }
  }
  isLoggedIn = false
  user = null
  return { TASK: 'LOGOUT', response: json }
}

function startWalk(s) {
  console.log('worker::startWalk(s)', s)
  walkState.name = s.name
  walkState.location = s.location
  walkState.date = s.date
  walkState.startTime = s.startTime
  walkState.startPosition = s.startPosition
  walkState.addPoint({ ...s.startPosition, timestamp: walkState.startTime, distance: 0 }, s.u, s.verbose)
  walkState.c = s.c
}

function setWayPoint(w) {
  walkState.addPoint(w.wp, w.u, w.verbose)
  walkState.c = w.c
  // walkState.printPoints()
}

function endWalk(e) {
  console.log('worker::endWalk(e)', e)
  walkState.endTime = e.endPosition.timestamp
  walkState.endPosition = e.endPosition
  walkState.addPoint(e.endPosition, e.u, e.verbose)
  walkState.c = e.c
}

onmessage = async (e) => {
  if (e.data?.TASK) {
    switch (e.data.TASK) {
      case 'SETUP':
        if (e.data.isAuth) {
          postMessage({ TASK: 'SETUP', ...await refresh(e.data) })
        }
        break
      case 'LOGIN':
        try {
          const result = await login(e.data)
          console.log('worker: ', result)
          postMessage(result)
        } catch (err) {
          console.log('worker: login failed: ', err)
          postMessage({ err: 'login failed', cause: err })
        }
        break
      case 'LOGOUT':
        try {
          const result = await logout(e.data)
          console.log('worker: ', result)
          postMessage(result)
        } catch (err) {
          console.log('logout failed: ', err)
          postMessage({ err: 'logout failed', cause: err })
        }
        break
      case 'GET_LIST':
        console.log(e.data.TASK)
        try {
          // const list = await getList(e.data)
          postMessage({ TASK: 'GET_LIST', ...await getList(e.data) })
        } catch (err) {
          console.error(`${e.data.TASK} failed.`, err)
          postMessage({ TASK: 'GET_LIST', err: 'getList failed', cause: err })
        }
        break
      case 'SET_PREF':
        console.log(e.data.TASK, e.data)
        postMessage({ TASK: 'SET_PREF', ...await setPref(e.data) })
        break
      case 'GET_HEADING':
        heading(e.data.p1, e.data.p2)
        pointDistance(e.data.p1, e.data.p2)
        break
      case 'START_WALK':
        console.log(e.data.TASK, e.data)
        startWalk(e.data)
        break
      case 'SET_WAYPOINT':
        console.log(e.data.TASK, e.data.wp)
        setWayPoint(e.data)
        break
      case 'STOP_WALK':
        console.log(e.data.TASK, e.data)
        endWalk(e.data)
        break
      case 'SAVE_WALK':
        console.log(e.data.TASK, e.data)
        postMessage({ TASK: 'SAVE', ...await saveWalk(e.data) })
        break
      case 'CLEAR_WALK':
        console.log(e.data.TASK)
        walkState.clear()
        // console.log('walk state is clear: ', walkState.get())
        break
      case 'DELETE_WALK':
        console.log('worker', e.data.TASK)
        postMessage({ TASK: 'DELETE', ...await deleteWalk(e.data) })
        break
      case 'GET_WALK':
        console.log('worker', e.data.TASK)
        postMessage({ TASK: 'GET_WALK', ...await showWalk(e.data) })
        break
      case 'EXPORT_WALK':
        console.log('worker', e.data.TASK)
        postMessage({ TASK: 'EXPORT_WALK', ...await exportKML(e.data) })
        break
      default:
        console.info(e)
        console.warn('Worker: received an unknown task from the main script.')
        console.warn('message data: ', e.data)
        throw new Error(`unsupported task: ${e.data.TASK}`)
    }
  }
}

postMessage('Take a walk.')
