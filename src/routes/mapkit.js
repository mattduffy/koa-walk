/**
 * @summary Koa router for the apple mapkit api endpoints.
 * @module @mattduffy/koa-glp
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/routes/mapkit.js
 */

import path from 'node:path'
import { readFile } from 'node:fs/promises'
import Router from '@koa/router'
import { ulid } from 'ulid'
import {
  _log,
  _info,
  _error,
} from '../utils/logging.js'
import {
  // addIpToSession,
  doTokensMatch,
  // processFormData,
} from './middlewares.js'

const Log = _log.extend('mapkit')
const Info = _info.extend('mapkit')
const Error = _error.extend('mapkit')
const router = new Router()

function sanitize(param) {
  return param
}

router.get('mapkitGetToken', '/mapkit/getToken', async (ctx) => {
  const log = Log.extend('get-token')
  const info = Info.extend('get-token')
  const error = Error.extend('get-token')
  if (ctx.state.isAsyncRequest === true) {
    log('Async query received.')
  }
  let mapKitAccessToken
  const csrfTokenCookie = ctx.cookies.get('csrfToken')
  const csrfTokenSession = ctx.session.csrfToken
  const newCsrfToken = ulid()
  if (doTokensMatch(ctx)) {
    try {
      const mapKitTokenPath = path.resolve(ctx.app.dirs.keys, 'mapkit', 'mapkit_js.jwt')
      mapKitAccessToken = await readFile(mapKitTokenPath, { encoding: 'utf-8' })
      info(`mapkit token: ${sanitize(mapKitAccessToken)}`)
      ctx.session.csrfToken = newCsrfToken
      ctx.cookies.set('csrfToken', newCsrfToken, { httpOnly: true, sameSite: 'strict' })
    } catch (e) {
      error(e)
      error('Failed to get mapkit token from file.')
      ctx.session.csrfToken = newCsrfToken
      ctx.cookies.set('csrfToken', newCsrfToken, { httpOnly: true, sameSite: 'strict' })
      ctx.type = 'application/json; charset=utf-8'
      ctx.status = 401
      ctx.body = { error: 'Failed to get mapkit token from file.', newCsrfToken }
    }
    ctx.type = 'application/json; charset=utf-8'
    ctx.status = 200
    ctx.body = { tokenID: mapKitAccessToken, newCsrfToken }
  } else {
    error(`CSR-Token mismatch: header:${csrfTokenCookie} - session:${csrfTokenSession}`)
    ctx.session.csrfToken = newCsrfToken
    ctx.cookies.set('csrfToken', newCsrfToken, { httpOnly: true, sameSite: 'strict' })
    ctx.type = 'application/json; charset=utf-8'
    ctx.status = 401
    ctx.body = { error: 'csrf token mismatch', newCsrfToken }
  }
})

export { router as mapkit }
