/**
 * @summary Koa router for the main top-level pages.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/routes/walk.js The router for the top level app URLs.
 */

import Router from '@koa/router'
import { ulid } from 'ulid'
import { ObjectId } from 'mongodb'
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

router.get('test', '/test', addIpToSession, async (ctx) => {
  const log = walkLog.extend('index-TEST')
  log(router.stack[0].path)
  log(router.stack[0].opts)
  log(router.stack[0].methods)
  log(router.stack[0].stack)
  ctx.type = 'application/json; charset=utf-8'
  ctx.body = router.stack[0]
})

router.get('index', '/', addIpToSession, hasFlash, async (ctx) => {
  const log = walkLog.extend('index')
  // const error = walkError.extend('index')
  log('inside walk router: /')
  log('was this a redirect from /mapkit/getToken?', ctx.request.headers)
  ctx.status = 200
  const csrfToken = ulid()
  ctx.session.csrfToken = csrfToken
  ctx.cookies.set('csrfToken', csrfToken, { httpOnly: true, sameSite: 'strict' })
  log('sessionUser: ', ctx.state?.sessionUser?.username)
  log('sessionUser email: ', ctx.state?.sessionUser?.email?.primary)
  log('isAuthenticated: ', ctx.state.isAuthenticated ?? false)
  log('preferences: ', ctx.state?.sessionUser?.preferences)
  log('preferences.orientation: ', ctx.state?.sessionUser?.preferences?.orientation)

  const locals = {
    csrfToken,
    sessionUser: ctx.state.sessionUser,
    body: ctx.body,
    flash: ctx.flash?.index ?? {},
    title: `${ctx.app.site}: Walk`,
    isAuthenticated: ctx.state.isAuthenticated ?? false,
    preferences: ctx.state.sessionUser?.preferences ?? false,
    // units: ctx.state.sessionUser?.preferences?.units ?? false,
  }
  await ctx.render('index', locals)
})

router.post('refresh', '/user/refresh', addIpToSession, processFormData, async (ctx) => {
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
    if (ctx.state?.sessionUser) {
      body = {
        status: 'success',
        user: {
          first: ctx.state.sessionUser.firstName,
          last: ctx.state.sessionUser.lastName,
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
    ctx.body = { status: 'fail', message: 'csrf token mismatch', csrfToken: newCsrfToken }
  }
})

router.post(
  'setPref',
  '/user/preferences/update',
  addIpToSession,
  processFormData,
  async (ctx) => {
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
      body.status = 401
    } else {
      log('sessionUser: ', ctx.state?.sessionUser?.username)
      log('sessionUser email: ', ctx.state?.sessionUser?.email?.primary)
      log('isAuthenticated: ', ctx.state.isAuthenticated ?? false)
      let units
      if (ctx.request.body?.units) {
        [units] = ctx.request.body?.units
      } 
      let orientation
      if (ctx.request.body?.orientation) {
        [orientation] = ctx.request.body?.orientation
      }
      log('preference units:       ', units)
      log('preference orientation: ', orientation)
      if (units) {
        ctx.state.sessionUser.preferences.units = units
      }
      if (orientation) {
        ctx.state.sessionUser.preferences.orientation = orientation
      }
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
      ctx.body = body
    }
  } else {
    ctx.cookies.set('csrfToken', newCsrfToken, { httpOnly: true, sameSite: 'strict' })
    ctx.body = { status: 'fail', message: 'user is not authenticated', csrfToken: newCsrfToken }
  }
})

router.get('saveWalkRedirect', '/save', addIpToSession, async (ctx) => {
  ctx.redirect('/')
})

router.post('showWalk', '/showWalk', addIpToSession, processFormData, async (ctx) => {
  const log = walkLog.extend('showWalk')
  const error = walkError.extend('showWalk')
  log('inside walk router: /showWalk')
  const body = {}
  const newCsrfToken = ulid()
  body.newCsrfToken = newCsrfToken
  ctx.status = 200
  ctx.type = 'application/json; charset=utf-8'
  if (doTokensMatch(ctx)) {
    if (!ctx.state?.isAuthenticated) {
      const msg = 'User is not authenticated, not able to show saved walk.'
      error(msg)
      body.message = msg
      ctx.status = 401
    } else {
      log('sessionUser: ', ctx.state?.sessionUser?.username)
      log('isAuthenticated: ', ctx.state.isAuthenticated)
      log('retrieving saved walk')
      const walkId = ctx.request.body.walkId[0]
      log(walkId)
      try {
        const db = ctx.state.mongodb.client.db()
        const collection = db.collection('walks')
        const query = { _id: new ObjectId(walkId) }
        const walk = await collection.findOne(query)
        log(walk)
        body.walk = walk
        body.msg = `found saved walk (id: ${walkId}`
      } catch (e) {
        error('failed to retrieve saved walk from db')
        error(e)
        ctx.status = 500
        body.msg = 'failed to retrieve saved walk from db'
        body.e = e
      }
      ctx.session.csrfToken = newCsrfToken
      ctx.cookies.set('csrfToken', newCsrfToken, { httpOnly: true, sameSite: 'strict' })
    }
  } else {
    ctx.session.csrfToken = newCsrfToken
    ctx.cookies.set('csrfToken', newCsrfToken, { httpOnly: true, sameSite: 'strict' })
  }
  ctx.body = body
})

router.post('saveWalk', '/save', addIpToSession, processFormData, async (ctx) => {
  const log = walkLog.extend('save')
  const error = walkError.extend('save')
  log('inside walk router: /save')
  const body = {}
  const newCsrfToken = ulid()
  body.newCsrfToken = newCsrfToken
  ctx.status = 200
  ctx.type = 'application/json; charset=utf-8'
  if (doTokensMatch(ctx)) {
    if (!ctx.state?.isAuthenticated) {
      const msg = 'User is not authenticated, not able to save walk.'
      error(msg)
      body.message = msg
      ctx.status = 401
    } else {
      log('sessionUser: ', ctx.state?.sessionUser?.username)
      log('isAuthenticated: ', ctx.state.isAuthenticated)
      log('saving walk')
      const walk = JSON.parse(ctx.request.body.walk[0])
      walk.userId = ctx.state.sessionUser.id
      log(walk)
      try {
        const db = ctx.state.mongodb.client.db()
        const collection = db.collection('walks')
        const saved = await collection.insertOne(walk)
        log(saved)
        body.saved = saved
        body.msg = 'saved a walk.'
      } catch (e) {
        error('failed to save walk to db')
        error(e)
        ctx.status = 500
        body.msg = 'failed to save walk to db'
        body.e = e
      }
    }
  } else {
    ctx.session.csrfToken = newCsrfToken
    ctx.cookies.set('csrfToken', newCsrfToken, { httpOnly: true, sameSite: 'strict' })
  }
  ctx.body = body
})

router.post('deleteWalk', '/delete', addIpToSession, processFormData, async (ctx) => {
  const log = walkLog.extend('delete')
  const error = walkError.extend('delete')
  log('inside walk router: /delete')
  const newCsrfToken = ulid()
  const body = {}
  body.newCsrfToken = newCsrfToken
  ctx.status = 200
  ctx.type = 'application/json; charset=utf-8'
  if (doTokensMatch(ctx)) {
    if (!ctx.state.isAuthenticated) {
      const msg = 'User is not authenticated, unable to delete walk.'
      error(msg)
      body.msg = msg
      ctx.status = 401
    } else {
      log('sessionUser: ', ctx.state?.sessionUser?.username)
      log('isAuthenticated: ', ctx.state.isAuthenticated)
      log('deleting walk')
      const [walkId] = ctx.request.body.toBeDeleted
      try {
        const db = ctx.state.mongodb.client.db()
        const collection = db.collection('walks')
        const query = { _id: new ObjectId(walkId) }
        const deleted = await collection.deleteOne(query)
        log(deleted)
        body.deleted = deleted
        if (deleted.deletedCount === 1) {
          body.msg = `deleted walk (id: ${walkId}).`
        } else {
          body.msg = `failed to delete walk ${walkId} for some reason.`
        }
      } catch (e) {
        error(e)
        error(`failed to delete walk ${walkId} from db`)
        ctx.status = 500
        body.msg = 'failed to delete walk from db'
        body.e = e
      }
      ctx.session.csrfToken = newCsrfToken
      ctx.cookies.set('csrfToken', newCsrfToken, { httpOnly: true, sameSite: 'strict' })
    }
  } else {
    ctx.cookies.set('csrfToken', newCsrfToken, { httpOnly: true, sameSite: 'strict' })
  }
  ctx.body = body
})

router.get('getDeleteWalk', '/delete', addIpToSession, async (ctx) => {
  ctx.redirect('/')
})

router.post('getList', '/getList', addIpToSession, processFormData, async (ctx) => {
  const log = walkLog.extend('getList')
  const error = walkError.extend('getList')
  log('inside walk router: /getList')
  const newCsrfToken = ulid()
  const list = []
  if (doTokensMatch(ctx)) {
    if (!ctx.state?.isAuthenticated) {
      error('user is not authenticated, no list available')
      list.push({ date: new Date(), coords: [], waypoints: [] })
    } else {
      log('sessionUser: ', ctx.state?.sessionUser.username)
      log('sessionUser email: ', ctx.state?.sessionUser?.email?.primary)
      log('isAuthenticated: ', ctx.state.isAuthenticated ?? false)
      const db = ctx.state.mongodb.client.db()
      const collection = db.collection('walks')
      const filter = { userId: new ObjectId(ctx.state.sessionUser.id) }
      const project = { 'features.properties.name': 1, 'features.properties.date': 1 }
      const options = { sort: { 'features.properties.date': -1 } }
      const walks = await collection.find(filter, options).project(project).toArray()
      log(walks)
      ctx.session.csrfToken = newCsrfToken
      ctx.cookies.set('csrfToken', newCsrfToken, { httpOnly: true, sameSite: 'strict' })
      const body = {
        newCsrfToken,
        list: [...list, ...walks],
      }
      ctx.status = 200
      ctx.type = 'application/json; charset=utf-8'
      ctx.body = body
    }
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

router.post('getWalk', '/getWalk', addIpToSession, processFormData, async (ctx) => {
  const log = walkLog.extend('getWalk')
  const error = walkError.extend('getWalk')
  log('inside walk router: /getWalk')
  const newCsrfToken = ulid()
  let walk
  if (doTokensMatch(ctx)) {
    if (!ctx.state?.isAuthenticated) {
      error('user is not authenticated, no saved walks available')
      ctx.status = 401
      ctx.type = 'application/json; charset=utf-8'
      ctx.body = {
        status: 'not authenticated',
        walk: null,
        error: 'forbidden',
        newCsrfToken,
      }
    } else {
      log('sessionUser: ', ctx.state?.sessionUser.username)
      log('sessionUser email: ', ctx.state?.sessionUser?.email?.primary)
      log('isAuthenticated: ', ctx.state.isAuthenticated ?? false)
      const walkId = ctx.request.body.walkId[0]
      const db = ctx.state.mongodb.client.db()
      const collection = db.collection('walks')
      const query = { _id: new ObjectId(walkId), userId: new ObjectId(ctx.state.sessionUser.id) }
      walk = await collection.findOne(query)
      log(walk)
      ctx.status = 200
      ctx.type = 'application/json; charset=utf-8'
      ctx.body = {
        newCsrfToken,
        walk,
      }
    }
  } else {
    ctx.type = 'application/json; charset=utf-8'
    ctx.body = {
      status: 'token mismatch',
      walk: null,
      error: 'token mismatch',
      newCsrfToken,
    }
  }
})

router.get('/getGetWalk', '/getWalk', addIpToSession, async (ctx) => {
  ctx.redirect('/')
})
export { router as walk }
