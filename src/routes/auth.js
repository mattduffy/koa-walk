/**
 * @summary Koa router for the main top-level pages.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/routes/auth.js The router for authentication related actions.
 */

import Router from '@koa/router'
import { koaBody } from 'koa-body'
import { ObjectId } from 'mongodb'
import Debug from 'debug'
import { Users } from '../models/users.js'

// const log = Debug('koa-stub:routes:auth:log')
// const error = Debug('koa-stub:routes:auth:error')
const router = new Router()

router.get('getLogin', '/login', async (ctx, next) => {
  const log = Debug('koa-stub:routes:auth_login:log')
  const error = Debug('koa-stub:routes:auth_login:error')
  log('logging the user in')
  ctx.state.user = ctx.state.user || {}
  if (ctx.state.isAuthenticated) {
    ctx.redirect('/')
  }
  const csrfToken = new ObjectId().toString()
  const flashMessage = ctx.flash
  const locals = {
    body: ctx.body,
    title: `${ctx.app.site}: Login`,
    user: ctx.state.user,
    csrfToken,
    login: flashMessage?.login || {},
  }
  error('template {locals}: %O', locals)
  ctx.session.csrfToken = locals.csrfToken
  ctx.cookies.set('csrfToken', csrfToken, { httpsOnly: true, sameSite: 'strict' })
  await ctx.render('login', locals)
  await next()
})

router.post('postLogin', '/login', koaBody(), async (ctx, next) => {
  const log = Debug('koa-stub:routes:auth_login_post:log')
  const error = Debug('koa-stub:routes:auth_login_post:error')
  const csrfTokenCookie = ctx.cookies.get('csrfToken')
  const csrfTokenSession = ctx.session.csrfToken
  const csrfTokenHidden = ctx.request.body['csrf-token']
  const { username, password } = ctx.request.body
  log(csrfTokenCookie, csrfTokenSession, ctx.request.body)
  if (csrfTokenCookie === csrfTokenSession && csrfTokenSession === csrfTokenHidden) {
    const db = ctx.state.mongodb.client.db()
    await next()
    const collection = db.collection('users')
    const users = new Users(collection)
    const authUser = await users.authenticateAndGetUser(username, password)
    if (!authUser.user) {
      ctx.state.isAuthenticated = false
      ctx.flash = {
        login: {
          username,
          message: authUser.message,
          error: authUser.error,
        },
      }
      // error(ctx.flash)
      ctx.redirect('/login')
    } else {
      log('successful user login')
      ctx.state.user = authUser.user
      ctx.state.isAuthenticated = true
      ctx.cookies.set('csrfToken')
      ctx.cookies.set('csrfToken.sig')
      ctx.session.id = authUser.user._id
      ctx.session.jwts = authUser.user._jwts
      ctx.state.user = authUser.user
      delete ctx.session.csrfToken
      ctx.redirect('/')
      // ctx.body = {
      //   status: 'ok',
      //   user: authUser.user,
      // }
    }
  } else {
    error('csrf token mismatch')
    ctx.body = { status: 'Error, csrf tokens do not match' }
  }
  ctx.type = 'application/json'
})

router.get('getLogout', '/logout', async (ctx, next) => {
  const log = Debug('koa-stub:routes:auth_logout:log')
  const error = Debug('koa-stub:routes:auth_logout:error')
  await next()
  if (ctx.state.isAuthenticated) {
    log('logging out')
    ctx.state.user = {}
    ctx.session = null
  }
  ctx.cookies.set('csrfToken')
  ctx.cookies.set('csrfToken.sig')
  ctx.redirect('/')
})

export { router as auth }
