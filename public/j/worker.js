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

async function getList(credentials) {
  let response
  let list = { TASK: 'GET_LIST', list: null, auth: null }
  let auth
  console.log('is logged in: ', isLoggedIn)
  console.log('user: ', user)
  if (!isLoggedIn) {
    auth = 'no'
    list = { ...list, list: [], auth }
    return list
  }
  const formData = new FormData()
  formData.append('csrfTokenHidden', credentials.csrfTokenHidden)
  formData.append('userId', user.userId)
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
  auth = 'yes'
  try {
    response = await fetch(request)
    console.log(response)
    const json = await response.json()
    console.log('getList response: ', json)
    list = { ...list, list: json.list, auth }
  } catch (e) {
    console.error(e)
    list = {
      ...list,
      list: [],
      auth,
      error: e,
    }
  }
  return list
}
async function refresh(o) {
  const formData = new FormData()
  formData.append('jwtAccess', o.jwtAccess)
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
}
async function login(credentials) {
  // console.log('creds: ', credentials)
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
  } catch (e) {
    console.error(e)
    return { TASK: 'LOGIN', login: 'failed', cause: e }
  }
  isLoggedIn = true
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

function startWalk(c) {
  walkState.name = c.name
  walkState.date = c.date
  walkState.startTime = c.startTime
  walkState.startPosition = c.startPosition
  walkState.addPoint({ ...c.startPosition, timestamp: walkState.startTime })
  walkState.c = c.c
}

function setWayPoint(w) {
  walkState.addPoint(w.wp)
  walkState.c = w.c
  walkState.printPoints()
}

function endWalk(c) {
  walkState.endPosition = c.endPosition
  walkState.endTime = c.endTime
  walkState.addPoint(c)
  walkState.c = c.c
}

onmessage = async (e) => {
  if (e.data?.TASK) {
    switch (e.data.TASK) {
      case 'SETUP':
        if (e.data.isAuth) {
          // isLoggedIn = true
          refresh(e.data)
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
          postMessage(list)
        } catch (err) {
          console.error(`${e.data.TASK} failed.`, err)
          postMessage({ err: 'getList failed', cause: err })
        }
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
        // setWayPoint(e.data.wp)
        setWayPoint(e.data)
        break
      case 'STOP_WALK':
        console.log(e.data.TASK, e.data)
        endWalk(e.data)
        break
      case 'SAVE_WALK':
        console.log(e.data.TASK, e.data.msg)
        break
      case 'GET_WALK':
        console.log(e.data.TASK, e.data.msg)
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
