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
  ctx.cookies.set('csrfToken.sig')
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
    units: ctx.state.sessionUser?.preferences?.units ?? false,
  }
  await ctx.render('index', locals)
})

router.post('refresh', '/refresh', addIpToSession, processFormData, async (ctx) => {
  const log = walkLog.extend('refresh')
  // const error = walkError.extend('refresh')
  log('inside walk router: /refresh')
  let body
  const [csrfTokenHidden] = ctx.request.body.csrfTokenHidden
  log(`csrfTokenHidden: ${csrfTokenHidden}`)
  const newCsrfToken = ulid()
  if (doTokensMatch(ctx)) {
    ctx.session.csrfToken = newCsrfToken
    ctx.cookies.set('csrfToken', newCsrfToken, { httpOnly: true, sameSite: 'strict' })
    ctx.cookies.set('csrfToken.sig')
    if (ctx.state?.sessionUser) {
      body = {
        status: 'success',
        user: {
          first: ctx.state.sessionUser.firstName,
          email: ctx.state.sessionUser.email.primary,
        },
        newCsrfToken,
      }
      log(`refreshing user: ${body}`)
    } else {
      body = { status: 'failed', user: {}, newCsrfToken }
    }
    ctx.status = 200
    ctx.type = 'application/json; charset=utf-8'
    ctx.body = body
  } else {
    ctx.session.csrfToken = newCsrfToken
    ctx.cookies.set('csrfToken', newCsrfToken, { httpOnly: true, sameSite: 'strict' })
    ctx.cookies.set('csrfToken.sig')
    ctx.body = { status: 'fail', message: 'csrf token mismatch', csrfToken: newCsrfToken }
  }
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

router.post('setPref', '/user/preferences/update', addIpToSession, processFormData, async (ctx) => {
  const log = walkLog.extend('setPref')
  const error = walkError.extend('setPref')
  const newCsrfToken = ulid()
  const body = {}
  body.newCsrfToken = newCsrfToken
  ctx.status = 200
  ctx.type = 'application/json; charset=utf-8'
  log('inside walk router: /user/preferences/update')
  if (doTokensMatch(ctx)) {
    if (!ctx.state?.isAuthenticated) {
      const msg = 'user is not authenticated, no access to saved preferences.'
      error(msg)
      body.message = msg
      body.status = 'failed'
    } else {
      log('sessionUser: ', ctx.state?.sessionUser?.username)
      log('sessionUser email: ', ctx.state?.sessionUser?.email?.primary)
      log('isAuthenticated: ', ctx.state.isAuthenticated ?? false)
      const [units] = ctx.request.body.units
      log(units)
      ctx.state.sessionUser.preferences = { units }
      try {
        const temp = await ctx.state.sessionUser.update()
        log('did user.update() work to update preferences?')
        log(temp._preferences)
        body.status = 'ok'
        body.message = 'Preferences updated.'
      } catch (e) {
        error('failed to save update to user preferences.')
        error(e)
      }
      ctx.session.csrfToken = newCsrfToken
      ctx.cookies.set('csrfToken', newCsrfToken, { httpOnly: true, sameSite: 'strict' })
      ctx.cookies.set('csrfToken.sig')
      ctx.body = body
    }
  } else {
    ctx.cookies.set('csrfToken', newCsrfToken, { httpOnly: true, sameSite: 'strict' })
    ctx.cookies.set('csrfToken.sig')
    ctx.body = { status: 'fail', message: 'user is not authenticated', csrfToken: newCsrfToken }
  }
})

router.post('getList', '/getList', addIpToSession, processFormData, async (ctx) => {
  const log = walkLog.extend('getList')
  const error = walkError.extend('getList')
  log('inside walk router: /getList')
  const newCsrfToken = ulid()
  const list = []
  list.push({
    active: false,
    date: 1738710829525,
    name: 'My first big boy walk',
    startTime: 1738710829525,
    startPosition: { latitude: 37.82445236440165, longitude: -122.20887165222129, accuracy: 37 },
    currentPosition: { latitude: 37.824332043711095, longitude: -122.20883164905806, accuracy: 37 },
    endPosition: { latitude: 37.824332043711095, longitude: -122.20883164905806, accuracy: 37, timestamp: 1738711024460, distance: 0 },
    endTime: 1738711024460,
    wayPoints: [
      {latitude: 37.82445236440165, longitude: -122.20887165222129, accuracy: 37, timestamp: 1738710829525, distance: 0},
      {latitude: 37.82433204932095, longitude: -122.20883165088334, accuracy: 37, timestamp: 1738710904469, distance: 13.83207568454471},
      {latitude: 37.824332043711095, longitude: -122.20883164905806, accuracy: 37, timestamp: 1738710974192, distance: 0.0006440597739965577},
      {latitude: 37.824332043711095, longitude: -122.20883164905806, accuracy: 37, timestamp: 1738710974192, distance: 0.0006440597739965577},
    ],
    c: [
      {latitude: 37.82445236440165, longitude: -122.20887165222129},
      {latitude: 37.82433204932095, longitude: -122.20883165088334},
      {latitude: 37.82433204932095, longitude: -122.20883165088334},
      {latitude: 37.824332043711095, longitude: -122.20883164905806},
    ],
    duration: null,
  })
  if (doTokensMatch(ctx)) {
    if (!ctx.state?.isAuthenticated) {
      error('user is not autheenticated, no list available')
      list.push({ date: new Date(), coords: [], waypoints: [] })
    }
    log('sessionUser: ', ctx.state?.sessionUser?.username)
    log('sessionUser email: ', ctx.state?.sessionUser?.email?.primary)
    log('isAuthenticated: ', ctx.state.isAuthenticated ?? false)
    ctx.session.csrfToken = newCsrfToken
    ctx.cookies.set('csrfToken', newCsrfToken, { httpOnly: true, sameSite: 'strict' })
    ctx.cookies.set('csrfToken.sig')
    const body = {
      newCsrfToken,
      // sessionUser: ctx.state.sessionUser,
      list,
    }
    ctx.status = 200
    ctx.type = 'application/json; charset=utf-8'
    ctx.body = body
  } else {
    ctx.type = 'application/json; charset=utf-8'
    ctx.body = {
      status: 'token mismatch',
      user: null,
      error: 'token mismatch',
      newCsrfToken,
    }
  }
})

export { router as walk }
