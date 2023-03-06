/**
 * @summary Koa router for the account api endpoints.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/routes/account.js The router for the account api endpoints.
 */

import Router from '@koa/router'
import { koaBody } from 'koa-body'
import Debug from 'debug'
import { ObjectId } from 'mongodb'
import { Users, AdminUser } from '../models/users.js'

const router = new Router()

function capitalize(word) {
  return word[0].toUpperCase() + word.substring(1).toLowerCase()
}

function sanitize(param) {
  // fill in with some effective input scubbing logic
  return param
}

async function hasFlash(ctx, next) {
  const log = Debug('koa-stub:routes:main:hasFlash_log')
  const error = Debug('koa-stub:routes:main:hasFlash_error')
  if (ctx.flash) {
    log('ctx.flash is present: %o', ctx.flash)
  } else {
    error('ctx.flash is missing.')
  }
  await next()
}

router.get('getUsers', '/users/:type*', koaBody(), async (ctx, next) => {
  const log = Debug('koa-stub:routes:users_log')
  const error = Debug('koa-stub:routes:users_error')
  log('inside users router: /users')
  // only authenticated Admin level users can access this route
  if (!ctx.state.isAuthenticated || ctx.state.user.type !== 'Admin') {
    ctx.status = 401
    ctx.type = 'text/plain; charset=utf-8'
    ctx.body = 'Unauthorized'
  } else {
    const db = ctx.state.mongodb.client.db()
    let filter
    if (!ctx.params.type) {
      filter = {}
    } else {
      // filter = { type: capitalize(sanitize(ctx.params.type)) }
      filter = { userTypes: [capitalize(sanitize(ctx.params.type))] }
    }
    await next()
    const collection = db.collection('users')
    const users = new Users(collection, ctx)
    let allUsers
    try {
      // this uses the aggregate query to group by user type
      allUsers = await users.getAllUsers(filter)
    } catch (err) {
      error('Error getting all users.')
      error(err)
    }
    ctx.status = 200
    ctx.type = 'application/json'
    ctx.body = { users: allUsers }
  }
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
  const users = new Users(collection, ctx)
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
  const users = new Users(collection, ctx)
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

router.get('viewDetails', '/account/view', hasFlash, async (ctx, next) => {
  const user = ctx.state.user ?? null
  const log = Debug('koa-stub:routes:user_edit_log')
  const error = Debug('koa-stub:routes:user_edit_error')
  log(`Edit ${user.username}'s account details.`)
  if (!ctx.state.isAuthenticated) {
    ctx.redirect('/')
  }
  const locals = {
    user,
    body: ctx.body,
    edit: ctx.flash.edit ?? {},
    csrfToken: new ObjectId().toString(),
    isAuthenticated: ctx.state.isAuthenticated,
    title: `${ctx.app.site}: View Account Details`,
  }
  await next()
  ctx.status = 200
  await ctx.render('account/user-view-details', locals)
})

router.get('editDetails', '/account/edit', hasFlash, async (ctx, next) => {
  const user = ctx.state.user ?? null
  const log = Debug('koa-stub:routes:user_edit_log')
  const error = Debug('koa-stub:routes:user_edit_error')
  log(`Edit ${user.username}'s account details.`)
  if (!ctx.state.isAuthenticated) {
    ctx.redirect('/')
  }
  const locals = {
    user,
    body: ctx.body,
    edit: ctx.flash.edit ?? {},
    csrfToken: new ObjectId().toString(),
    isAuthenticated: ctx.state.isAuthenticated,
    title: `${ctx.app.site}: Edit Account Details`,
  }
  await next()
  ctx.status = 200
  await ctx.render('account/user-edit-details', locals)
})

export { router as account }
