/**
 * @summary Koa router for the main top-level pages.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/routes/auth.js The router for authentication related actions.
 */

import Router from '@koa/router'
import { ulid } from 'ulid'
// import { ObjectId } from 'mongodb'
import { _log, _error } from '../utils/logging.js'
import { Users } from '../models/users.js'
import {
  addIpToSession,
  doTokensMatch,
  processFormData,
  hasFlash,
} from './middlewares.js'

const authLog = _log.extend('auth')
const authError = _error.extend('auth')
const router = new Router()

router.get('getLogin', '/login', async (ctx, next) => {
  const log = authLog.extend('GET-login')
  const error = authError.extend('GET-login')
  log('logging the user in')
  try {
    await next()
  } catch (e) {
    error(e)
    ctx.throw(500, e)
  }
  ctx.state.sessionUser = ctx.state.sessionUser ?? {}
  if (ctx.state.isAuthenticated) {
    ctx.redirect('/')
  }
  const csrfToken = ulid()
  const locals = {
    body: ctx.body,
    title: `${ctx.app.site}: Login`,
    sessionUser: ctx.state.sessionUser,
    csrfToken,
    login: ctx.flash.login ?? {},
    isAuthenticated: ctx.state.isAuthenticated,
  }
  log('template {locals}: %O', locals)
  ctx.session.csrfToken = locals.csrfToken
  ctx.cookies.set('csrfToken', csrfToken, { httpOnly: true, sameSite: 'strict' })
  await ctx.render('login', locals)
})

router.post('postLogin', '/login', addIpToSession, hasFlash, processFormData, async (ctx) => {
  const log = authLog.extend('POST-login')
  const error = authError.extend('POST-login')
  log(ctx.request.body)
  const sessionId = ctx.cookies.get('session')
  const [username] = ctx.request.body.username
  const [password] = ctx.request.body.password
  const newCsrfToken = ulid()
  if (doTokensMatch(ctx)) {
    const db = ctx.state.mongodb.client.db()
    const collection = db.collection('users')
    const users = new Users(collection, ctx)
    const authUser = await users.authenticateAndGetUser(username, password)
    log('authentication result: %O', authUser)
    log('authentication result: %O', authUser.email)
    log('authentication result: %O', authUser.user?._username)
    const doc = { attemptedAt: new Date(), username }
    if (ctx.state?.logEntry) {
      doc.from = { ip: ctx.state.logEntry.ip, geo: ctx.state.logEntry.geo }
    }
    if (!authUser.user) {
      doc.incorrectPassword = password
      await db.collection('loginAttempts').insertOne(doc)
      ctx.state.isAuthenticated = false
      ctx.flash = {
        login: {
          username,
          info: authUser.info,
          message: authUser.message,
          error: authUser.error,
        },
      }
      error(`Unsuccesful login attempt for ${username}`)
      if (ctx.state.isAsyncRequest) {
        ctx.type = 'application/json; charset=utf-8'
        ctx.body = {
          status: 'login failed',
          info: authUser.info,
          message: authUser.message,
          error: authUser.error,
        }
      } else {
        error('unsuccessful logoin attempt - not an async request.')
        ctx.redirect('/login')
      }
    } else if (authUser) {
      await db.collection('loginAttempts').insertOne(doc)
      log('successful user login')
      authUser.user.sessionId = sessionId
      let loggedInUser
      try {
        loggedInUser = await authUser.user.update()
        log('updated user with session id: ', sessionId)
        ctx.state.sessionUser = loggedInUser
        ctx.state.isAuthenticated = true
        ctx.session.id = loggedInUser.id
        ctx.session.jwts = loggedInUser.jwts
        ctx.session.username = loggedInUser.username
        ctx.session.csrfToken = newCsrfToken
        ctx.cookies.set('csrfToken', newCsrfToken, { httpOnly: true, sameSite: 'strict' })
        ctx.cookies.set('csrfToken.sig')
        ctx.flash = {
          index: {
            username: loggedInUser.username,
            message: `Hello ${loggedInUser.firstName}`,
            info: authUser.message,
            error: null,
          },
        }
        if (ctx.state.isAsyncRequest) {
          ctx.type = 'application/json; charset=utf-8'
          ctx.body = { status: 'success', user: { first: loggedInUser.firstName, email: loggedInUser.email.primary, newCsrfToken } }
        } else {
          error('successful login - not async request?')
          ctx.redirect('/')
        }
      } catch (e) {
        error(e)
        ctx.type = 'application/json; charset=utf-8'
        ctx.body = { status: 'failed', cause: e, newCsrfToken }
      }
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

router.get('getLogout', '/logout', async (ctx) => {
  const log = authLog.extend('logout-get')
  // const error = authError.extend('logout')
  if (ctx.state.isAuthenticated) {
    log('logging out')
    ctx.state.sessionUser = null
    ctx.session = null
  }
  ctx.state.isAuthenticated = false
  const newCsrfToken = ulid()
  ctx.cookies.set('csrfToken', newCsrfToken)
  ctx.cookies.set('csrfToken.sig')
  if (ctx.state.isAsyncRequest) {
    ctx.body = { status: 'loggedOut', user: { newCsrfToken } }
  } else {
    ctx.redirect('/')
  }
})

export { router as auth }
