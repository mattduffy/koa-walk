/**
 * @summary Koa router for the user api endpoints.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/routes/users.js The router for the user api endpoints.
 */

import Router from '@koa/router'
import { koaBody } from 'koa-body'
import Debug from 'debug'
import { Users } from '../models/users.js'

const router = new Router()

function capitalize(word) {
  return word[0].toUpperCase() + word.substring(1).toLowerCase()
}

function sanitize(param) {
  // fill in with some effective input scubbing logic
  return param
}

router.get('getUsers', '/users', koaBody(), async (ctx, next) => {
  const log = Debug('koa-stub:routes:users_log')
  const error = Debug('koa-stub:routes:users_error')
  log('inside users router: /users')
  const db = ctx.state.mongodb.client.db()
  let filter
  if (ctx.query.type) {
    filter = { type: capitalize(ctx.query.type) }
  } else {
    filter = {}
  }
  await next()
  const collection = db.collection('users')
  const users = new Users(collection)
  let allUsers
  try {
    allUsers = await users.getAllUsers(filter)
  } catch (err) {
    error('Error getting all users.')
    error(err)
  }
  ctx.status = 200
  ctx.type = 'application/json'
  ctx.body = { users: allUsers }
})

router.get('getUserById', '/user/byId/:id', koaBody(), async (ctx, next) => {
  const log = Debug('koa-stub:routes:userById_log')
  const error = Debug('koa-stub:routes:userById_error')
  const { id } = ctx.params
  log(`looking up user by Id: ${id}`)
  if (Buffer.from(id).length !== 24 || /[^0-9A-Fa-f]/.test(id)) {
    ctx.throw(400, `Not a valid user ID: ${id}`)
  }
  ctx.state.user = { id }
  const db = ctx.state.mongodb.client.db()
  await next()
  const collection = db.collection('users')
  const users = new Users(collection)
  const foundUser = await users.getById(id)
  if (foundUser === null) {
    error(`No user found with ID: ${id}`)
    ctx.throw(404, `No user found with ID: ${id}`)
  }
  ctx.status = 200
  ctx.state.user = foundUser
  ctx.body = foundUser.toString()
  ctx.type = 'application/json'
})

router.get('getUserByEmail', '/user/byEmail/:email', koaBody(), async (ctx, next) => {
  const log = Debug('koa-stub:routes:userByEmail_log')
  const error = Debug('koa-stub:routes:userByEmail_error')
  const { email } = ctx.params
  log(`looking up user by email: ${email}`)
  if (/^[\w!#$%&'*+/=?`{|}~^-]+(?:\.[\w!#$%&'*+/=?`{|}~^-]+)*@(?:[A-Z0-9-]+\.)+[A-Z]{2,6}$/i.test(email)) {
    error(`Not a valid email address: ${email}`)
    ctx.throw(400, `Not a valid email address: ${email}`)
  }
  ctx.state.user = { email }
  const db = ctx.state.mongodb.client.db()
  await next()
  const collection = db.collection('users')
  const users = new Users(collection)
  const foundUser = await users.getByEmail(email)
  if (foundUser === null) {
    error(`No user found with email: ${email}`)
    ctx.throw(404, `No user found with email: ${email}`)
  }
  ctx.status = 200
  ctx.state.user = foundUser
  ctx.body = foundUser.toString()
  ctx.type = 'application/json'
})

router.get('getUserByUsername', '/user/:username', koaBody(), async (ctx, next) => {
  const log = Debug('koa-stub:routes:user_log')
  const error = Debug('koa-stub:routes:user_error')
  const username = sanitize(ctx.params.username)
  log(`loooking up user by username: ${username}`)
  let user
  const locals = {}
  await next()
  try {
    const db = ctx.state.mongodb.client.db()
    const collection = db.collection('users')
    const users = new Users(collection)
    user = await users.getByUsername(username)
    if (!user) {
      locals.title = `${ctx.app.site}: User Details`
      locals.username = username
    }
  } catch (err) {
    error(`Error getting username: ${username}`)
    error(err)
  }
  ctx.status = 200
  locals.title = `${ctx.app.site}: ${user.name}`
  locals.user = user
  locals.isAuthenticated = ctx.state.isAuthenticated
  await ctx.render('user', locals)
})

router.get(/^\/@([^@+?.:\s-][a-zA-Z0-9_]{2,30})$/, koaBody(), async (ctx, next) => {
  const log = Debug('koa-stub:routes:@username_log')
  const error = Debug('koa-stub:routes:@username_error')
  const username = sanitize(ctx.params[0])
  log(`loooking up user by @username: ${username}`)
  let user
  const locals = {}
  await next()
  try {
    const db = ctx.state.mongodb.client.db()
    const collection = db.collection('users')
    const users = new Users(collection)
    user = await users.getByUsername(username)
    if (!user) {
      locals.title = `${ctx.app.site}: User Details`
      locals.username = username
    }
  } catch (err) {
    error(`Error getting username: ${username}`)
    error(err)
  }
  ctx.status = 200
  locals.title = `${ctx.app.site}: ${user.name}`
  locals.user = user
  locals.isAuthenticated = ctx.state.isAuthenticated
  await ctx.render('user', locals)
})

export { router as users }
