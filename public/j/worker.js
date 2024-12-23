/*
 * file: public/j/worker.js
 */
/* eslint-env worker */
let isLoggedIn = false
let user = null
async function getList(credentials) {
  let response
  let list = { TASK: 'GET_LIST', list: null, auth: null }
  let auth
  if (!self.isLoggedIn) {
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
    const json = await response.json()
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
    console.log(user)
  } catch (e) {
    console.error(e)
    return { TASK: 'LOGIN', login: 'failed', cause: e }
  }
  self.isLoggedIn = true
  self.user = _user
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
  self.isLoggedIn = false
  self.user = null
  return { TASK: 'LOGOUT', response: json }
}

onmessage = async (e) => {
  console.log(self.name)
  console.log('2', e.data)
  if (e.data?.TASK) {
    switch (e.data.TASK) {
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
        console.log(e.data.TASK, e.data.msg)
        try {
          const list = await getList(e.data)
          postMessage(list)
        } catch (err) {
          console.error(`${e.data.TASK} failed.`, err)
          postMessage({ err: 'getList failed', cause: err })
        }
        break
      case 'START_WALK':
        console.log(e.data.TASK, e.data.msg)
        break
      case 'STOP_WALK':
        console.log(e.data.TASK, e.data.msg)
        break
      case 'SET_WAYPOINT':
        console.log(e.data.TASK, e.data.msg)
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
