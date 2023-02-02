/**
 * @summary Koa router for the main top-level pages.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/routes/main.js The router for the top level app URLs.
 */

import Router from '@koa/router'
import { koaBody } from 'koa-body'
import { ObjectId } from 'mongodb'
import { Users } from '../models/users.js'

const router = new Router()

router.get('getLogin', '/login', async (ctx, next) => {
  const user = ctx.state.user || {}
  if (user?.isAuthenticated) {
    ctx.redirect('/')
  }
  const csrfToken = new ObjectId().toString()
  const locals = {
    body: ctx.body,
    title: `${ctx.app.site}: Login`,
    user,
    csrfToken,
    messages: ctx.state.messages || {},
  }
  ctx.session.csrfToken = locals.csrfToken
  ctx.cookies.set('csrfToken', csrfToken, { httpsOnly: true, sameSite: 'strict' })
  await ctx.render('login', locals)
  await next()
})

router.post('postLogin', '/login', koaBody(), async (ctx, next) => {
  const csrfTokenCookie = ctx.cookies.get('csrfToken')
  const csrfTokenSession = ctx.session.csrfToken
  const csrfTokenHidden = ctx.request.body['csrf-token']
  const { username, password } = ctx.request.body
  console.log(csrfTokenCookie, csrfTokenSession, ctx.request.body)
  if (csrfTokenCookie === csrfTokenSession && csrfTokenSession === csrfTokenHidden) {
    const db = ctx.state.mongodb.client.db()
    await next()
    const collection = db.collection('users')
    const users = new Users(collection)
    const authUser = await users.authenticateAndGetUser(username, password)
    if (!authUser.user) {
      ctx.state.user.isAuthenticated = false
      ctx.state.messages = {
        login: {
          username,
          message: authUser.message,
          error: authUser.error,
        },
      }
      ctx.redirect('/login')
    } else {
      ctx.state.user = authUser.user
      ctx.state.user.isAuthenticated = true
      ctx.session._id = authUser.user._id
      ctx.session.jwts = authUser.user._jwts
      ctx.state.user = authUser.user
      ctx.cookies.set('csrfToken', null)
      ctx.cookies.set('csrfToken.sig', null)
      ctx.session.csrfToken = ''
      ctx.redirect('/')
      // ctx.body = {
      //   status: 'ok',
      //   user: authUser.user,
      // }
    }
  } else {
    ctx.body = { status: 'Error, csrf tokens do not match' }
  }
  ctx.type = 'application/json'
})

router.get('index', '/', async (ctx, next) => {
  await next()
  console.log('inside main router: /')
  const user = ctx.state.user || {}
  await ctx.render('index', { body: ctx.body, title: `${ctx.app.site}: Contact`, user })
})

router.get('about', '/about', async (ctx, next) => {
  await next()
  console.log('inside index router: /about')
  const user = ctx.state.user || {}
  await ctx.render('about', { body: ctx.body, title: `${ctx.app.site}: Contact`, user })
})

router.get('contact', '/contact', async (ctx, next) => {
  await next()
  const user = ctx.state.user || {}
  await ctx.render('contact', { title: `${ctx.app.site}: Contact`, user })
})

export { router as main }
