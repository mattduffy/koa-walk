/**
 * @summary Koa router for the user api endpoints.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/routes/users.js The router for the user api endpoints.
 */

import Router from '@koa/router'
import Debug from 'debug'
// import { Users } from '../models/users.js'
import { Users } from '@mattduffy/users'

const log = Debug('koa-stub:routes:users:log')
const error = Debug('koa-stub:routes:users:error')
const router = new Router()

router.get('getUsers', '/users', async (ctx, next) => {
  log('inside users router: /users')
  const db = ctx.state.mongodb.client.db()
  await next()
  const collection = db.collection('users')
  const users = new Users(collection)
  let allUsers
  try {
    allUsers = await users.getAllUsers()
  } catch (err) {
    error('Error getting all users.')
    error(err)
  }
  ctx.type = 'application/json'
  ctx.body = { users: allUsers }
})

router.get('getUser', '/user/:id', async (ctx, next) => {
  await next()
  log('inside index router: /about')
  await ctx.render('about', { body: ctx.body, title: `${ctx.app.site}: Contact` })
})

export { router as users }
