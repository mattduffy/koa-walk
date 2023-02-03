/**
 * @summary Koa router for the main top-level pages.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/routes/main.js The router for the top level app URLs.
 */

import Router from '@koa/router'
import { koaBody } from 'koa-body'
import { ObjectId } from 'mongodb'
import Debug from 'debug'
import { Users } from '../models/users.js'

const log = Debug('koa-stub:routes:users:log')
const error = Debug('koa-stub:routes:users:error')

const router = new Router()

async function getSessionUser(ctx, next) {
  if (ctx.session?.id) {
    try {
      const db = ctx.state.mongodb.client.db()
      const collection = db.collection('users')
      const users = new Users(collection)
      const user = await users.getById(ctx.session.id)
      if (user) {
        ctx.state.user = user
      }
    } catch (e) {
      error(e)
    }
  }
  await next()
}

router.get('index', '/', getSessionUser, async (ctx, next) => {
  await next()
  console.log('inside main router: /')
  const user = ctx.state.user || {}
  await ctx.render('index', { body: ctx.body, title: `${ctx.app.site}: Contact`, user })
})

router.get('about', '/about', getSessionUser, async (ctx, next) => {
  await next()
  console.log('inside index router: /about')
  const user = ctx.state.user || {}
  await ctx.render('about', { body: ctx.body, title: `${ctx.app.site}: Contact`, user })
})

router.get('contact', '/contact', getSessionUser, async (ctx, next) => {
  await next()
  const user = ctx.state.user || {}
  await ctx.render('contact', { title: `${ctx.app.site}: Contact`, user })
})

export { router as main }
