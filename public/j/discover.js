/*
 * file: public/j/discover.js
 */
/* worker globals are provided by eslint.config.js */
// import Observer from './Observer.js'
// import State from './State.js'
// import { heading, pointDistance } from './Heading.js'
// import { ObjectId } from './lib/bson.mjs' // eslint-disable-line import-x/no-relative-packages

const discover = self // eslint-disable-line no-restricted-globals
console.log('discovery worker', discover)

async function findNewTrailsInRadiusN(credentials) {
  console.log('discover::findNewTrailsInRadiusN(credentials):', credentials)
  // search url  format
  // /api/v1/osm/trails/<type>/<longitude>/<latitude>/<radius>/<result_page>?<query-string>
  // query-string format
  // ?tk=<csrfTokenHidden>&<param1>=<val1>...&<paramN>=<valN>
  const opts = {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${credentials.jwtAccess}`,
      'X-ASYNCREQUEST': true,
    },
  }
  const c = credentials
  const searchUrl = `${c.url}/api/v1/osm/trails/`
    + `${c.type}/${c.longitude}/${c.latitude}/${c.radius}/${c.page}`
    + `?csrfTokenHidden=${c.csrfTokenHidden}`
  console.log('submitting trails query to', searchUrl)
  const request = new Request(searchUrl, opts)
  let trails
  try {
    const response = await fetch(request)
    const json = await response.json()
    console.log('found new trails to try')
    trails = json
  } catch (e) {
    console.error('error finding new trails', e)
    trails = { status: 'failed', msg: 'failed to retrieve search results for trails', e }
  }
  console.log(trails)
  return trails
}

onmessage = async (e) => {
  console.log('discovery worker e.data', e.data)
  if (e.data?.TASK) {
    switch (e.data.TASK) {
      // case 'INIT':
      //   ({
      //     origin,
      //     appName,
      //     VERSION,
      //     VERBOSE,
      //   } = e.data)
      //   if (walkState && !walkState.version) {
      //     walkState.version = VERSION
      //   }
      //   break
      // case 'SETUP':
      //   if (e.data.isAuth) {
      //     postMessage({ TASK: 'SETUP', ...await refresh(e.data) })
      //   }
      //   break
      case 'FIND_TRAILS':
        try {
          const trailsFound = await findNewTrailsInRadiusN(e.data)
          postMessage({ TASK: 'FIND_TRAILS', status: 'ok', ...trailsFound })
        } catch (err) {
          console.log('search request failed:', err)
          postMessage({ TASK: 'FIND_TRAILS', err: 'search request failed', cause: err })
        }
        break
      default:
        console.info(e)
        console.warn('Worker: received an unknown task from the main script.')
        console.warn('message data: ', e.data)
        throw new Error(`unsupported task: ${e.data.TASK}`)
    }
  }
}
postMessage('Discover new trails.')
