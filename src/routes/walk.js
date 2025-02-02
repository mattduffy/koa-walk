/**
 * @summary Koa router for the main top-level pages.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/routes/walk.js The router for the top level app URLs.
 */

import Router from '@koa/router'
import { ulid } from 'ulid'
// import { ObjectId } from 'mongodb'
// import { Users } from '../models/users.js'
import { _log, _error } from '../utils/logging.js'
// import { redis } from '../daos/impl/redis/redis-client.js'
import {
  addIpToSession,
  doTokensMatch,
  processFormData,
  hasFlash,
} from './middlewares.js'

const walkLog = _log.extend('walk')
const walkError = _error.extend('walk')
/* eslint-disable-next-line no-unused-vars */
function sanitize(param) {
  // fill in with some effective input scubbing logic
  if (!param) walkError('missing param')
  return param
}
const router = new Router()

router.get('index', '/', addIpToSession, hasFlash, async (ctx) => {
  const log = walkLog.extend('index')
  // const error = walkError.extend('index')
  log('inside walk router: /')
  ctx.status = 200
  const csrfToken = ulid()
  ctx.session.csrfToken = csrfToken
  ctx.cookies.set('csrfToken', csrfToken, { httpOnly: true, sameSite: 'strict' })
  log('sessionUser: ', ctx.state?.sessionUser?.username)
  log('sessionUser email: ', ctx.state?.sessionUser?.email?.primary)
  log('isAuthenticated: ', ctx.state.isAuthenticated ?? false)
  const locals = {
    csrfToken,
    sessionUser: ctx.state.sessionUser,
    body: ctx.body,
    flash: ctx.flash?.index ?? {},
    title: `${ctx.app.site}: Walk`,
    isAuthenticated: ctx.state.isAuthenticated ?? false,
    units: ctx.state.sessionUser?.units ?? false,
  }
  await ctx.render('index', locals)
})

router.post('refresh', '/refresh', addIpToSession, processFormData, async (ctx) => {
  const log = walkLog.extend('refresh')
  // const error = walkError.extend('refresh')
  log('inside walk router: /refresh')
  let body
  if (ctx.state?.sessionUser) {
    body = { status: 'success', user: { first: ctx.state.sessionUser.firstName, email: ctx.state.sessionUser.email.primary } }
    log(`refreshing user: ${body}`)
  } else {
    body = { status: 'failed', user: {} }
  }
  ctx.status = 200
  ctx.type = 'application/json; charset=utf-8'
  ctx.body = body
})

router.post('saveWalk', '/save', addIpToSession, processFormData, async (ctx) => {
  const log = walkLog.extend('save')
  // const error = walkError.extend('save')
  log('inside walk router: /save')
  let body
  if (ctx.state?.sessionUser) {
    body = { status: 'save' }
  } else {
    body = { status: 'failed', msg: 'Must be logged in to permanently save a walk.' }
  }
  ctx.status = 200
  ctx.type = 'application/json; charset=utf-8'
  ctx.body = body
})

router.post('getList', '/getList', addIpToSession, processFormData, async (ctx) => {
  const log = walkLog.extend('getList')
  const error = walkError.extend('getList')
  log('inside walk router: /getList')
  const csrfToken = ulid()
  ctx.session.csrfToken = csrfToken
  ctx.cookies.set('csrfToken', csrfToken, { httpOnly: true, sameSite: 'strict' })
  const list = []
  if (doTokensMatch(ctx)) {
    if (!ctx.state?.isAuthenticated) {
      error('user is not autheenticated, no list available')
      list.push({ date: new Date(), coords: [], waypoints: [] })
    }
    log('sessionUser: ', ctx.state?.sessionUser?.username)
    log('sessionUser email: ', ctx.state?.sessionUser?.email?.primary)
    log('isAuthenticated: ', ctx.state.isAuthenticated ?? false)
    const body = {
      csrfToken,
      // sessionUser: ctx.state.sessionUser,
      list,
    }
    ctx.status = 200
    ctx.type = 'application/json; charset=utf-8'
    ctx.body = body
  } else {
    ctx.type = 'application/json; charset=utf-8'
    ctx.body = { status: 'token mismatch', user: null, error: 'token mismatch' }
  }
})

export { router as walk }
