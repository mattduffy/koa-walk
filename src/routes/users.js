/**
 * @summary Koa router for the user api endpoints.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/routes/users.js The router for the user api endpoints.
 */

import Router from '@koa/router'
import Debug from 'debug'
import { Users } from '../models/users.js'

const log = Debug('koa-stub:routes:users:log')
const error = Debug('koa-stub:routes:users:error')
const router = new Router()

function capitalize(word) {
  return word[0].toUpperCase() + word.substring(1).toLowerCase()
}

router.get('getUsers', '/users', async (ctx, next) => {
  log('inside users router: /users')
  const db = ctx.state.mongodb.client.db()
  const filter = { type: capitalize(ctx.query.type) }
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
  ctx.type = 'application/json'
  ctx.body = { users: allUsers }
})

router.get('getUserById', '/user/byId/:id', async (ctx, next) => {
  const { id } = ctx.params
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
    ctx.throw(404, `No user found with ID: ${id}`)
  }
  ctx.state.user = foundUser
  ctx.body = foundUser.toString()
  ctx.type = 'application/json'
})

router.get('getUserByEmail', '/user/byEmail/:email', async (ctx, next) => {
  const { email } = ctx.params
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
  ctx.state.user = foundUser
  ctx.body = foundUser.toString()
  ctx.type = 'application/json'
})

export { router as users }
