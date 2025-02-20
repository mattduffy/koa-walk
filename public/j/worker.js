/*
 * file: public/j/worker.js
 */
/* eslint-env worker */
// import Observer from './Observer.js'
import State from './State.js'
import { heading, pointDistance } from './Heading.js'

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
  formData.append('units', credentials.units)
  // formData.append('userId', user.userId)
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
    json.newUnits = credentials.units
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
  if (!isLoggedIn) {
    deleted.status = 'failed'
    deleted.msg = 'Must be logged in to delete a walk.'
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
  const saved = { TASK: 'SAVE', status: null, msg: null }
  if (!isLoggedIn) {
    saved.status = 'failed'
    saved.msg = 'Must be logged in to save a walk.'
  } else {
    const formData = new FormData()
    formData.append('csrfTokenHidden', credentials.csrfTokenHidden)
    // formData.append('walk', JSON.stringify(walkState.get()))
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
    } catch (e) {
      console.log('worker::save::fetch failed')
      console.log(e)
      saved.status = 'failed'
      saved.msg = 'Failed to save walk to database for some reason.'
    }
  }
  console.log('what happened to saved?', saved)
  return saved
}
async function showWalk(credentials) {
  console.log('woker::showWalk(credentials)', credentials)
  let response
  let walk
  if (!isLoggedIn) {
    walk = { status: 'failed', msg: 'login to see saved walks' }
    return walk
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
  // let list = { TASK: 'GET_LIST', list: null, auth: null }
  let list = { remoteList: null, localList: null, auth: null }
  let auth
  console.log('is logged in: ', isLoggedIn)
  console.log('user: ', user)
  if (credentials.scope === 'local' || credentials.scope === 'both') {
    auth = 'no'
    // get the local storage version here
    list = {
      ...list,
      remoteList: [],
      localList: [],
      auth,
    }
    if (!isLoggedIn) {
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
      list = {
        ...list,
        remoteList: json.list,
        auth,
        newCsrfToken: json.newCsrfToken,
      }
    } catch (e) {
      console.error(e)
      list = {
        ...list,
        remoteList: [],
        localList: [],
        auth,
        error: e,
      }
    }
  }
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
      return { TASK: 'LOGIN', login: 'failed', cause: _user }
    }
  } catch (e) {
    console.error(e)
    return { TASK: 'LOGIN', login: 'failed', cause: e }
  }
  user = _user
  console.log('is logged in: ', isLoggedIn)
  console.log('user: ', user)
  return { TASK: 'LOGIN', user: _user }
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
  walkState.addPoint({ ...s.startPosition, timestamp: walkState.startTime, distance: 0 }, s.u)
  walkState.c = s.c
}

function setWayPoint(w) {
  walkState.addPoint(w.wp, w.u)
  walkState.c = w.c
  walkState.printPoints()
}

function endWalk(e) {
  console.log('worker::endWalk(e)', e)
  walkState.endTime = e.endPosition.timestamp
  walkState.endPosition = e.endPosition
  walkState.addPoint(e.endPosition, e.u)
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
          const list = await getList(e.data)
          postMessage({ TASK: e.data.TASK, ...list })
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
        postMessage({ TASK: e.data.TASK, ...await showWalk(e.data) })
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
