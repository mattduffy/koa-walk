/*
 * file: public/j/worker.js
 */
/* eslint-env worker */
async function login(credentials) {
  console.log('creds: ', credentials)
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
  let user
  try {
    response = await fetch(request)
    user = await response.json()
  } catch (e) {
    return { TASK: 'LOGIN', login: 'failed', cause: e }
  }
  return { TASK: 'LOGIN', user }
}

onmessage = async (e) => {
  console.log(self.name)
  console.log('2', e.data)
  if (e.data?.TASK) {
    switch (e.data.TASK) {
      case 'LOGIN':
        try {
          const result = await login(e.data)
          console.log(result)
          postMessage(result)
        } catch (err) {
          console.log(err)
          postMessage({ err: 'login failed' })
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

// onerror = (error) => {
//   console.warn('oops')
//   console.warn(error)
// }
postMessage('Take a walk.')
