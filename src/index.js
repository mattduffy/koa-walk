/**
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/index.js The entry point to set up a koa test app.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Debug from 'debug'
import * as Koa from 'koa'
import serve from 'koa-static'
import Keygrip from 'keygrip'
import render from '@koa/ejs'
import * as dotenv from 'dotenv'
import * as mongoClient from './daos/impl/mongodb/mongo-client.js'
import { session, config } from './session-handler.js'
import { main } from './routes/main.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(`${__dirname}/..`)
const showDebug = process.env.NODE_ENV !== 'production'
dotenv.config({ path: path.resolve(root, 'config/app.env'), debug: showDebug })

const log = Debug('koa-stub:log')
const error = Debug('koa-stub:error')

const key1 = process.env.KEY1
const key2 = process.env.KEY2
const key3 = process.env.KEY3
const port = process.env.PORT || 3333

export const app = new Koa.default()
app.keys = new Keygrip([key1, key2, key3])
app.env = process.env.APP_ENV || 'development'
app.site = process.env.SITE_NAME || 'Web site'
app.domain = process.env.DOMAIN_NAME || 'website.com'
app.proxy = true
app.root = root
app.publicDir = `${root}/public`
app.templateName = 'default'
app.uploadsDir = `${root}/uploads`

app.use(session(config, app))
app.use(serve(app.publicDir))

render(app, {
  root: `${root}/views/${app.templateName}`,
  layout: 'template',
  viewExt: 'ejs',
  cache: false,
  debug: true,
  delimter: '%',
  async: true,
})

// logging
async function logging(ctx, next) {
  log('ctx.state: %o', ctx.state)
  await next()
  const rt = ctx.response.get('X-Response-Time')
  log(`${ctx.method} ${ctx.url} - ${rt}`)
  log('session: %o', ctx.session)
}

// x-response-time
async function xResponseTime(ctx, next) {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  ctx.set('X-Response-Time', `${ms}`)
}

// response
async function response(ctx, next) {
  await next()
  log(ctx.request.header)
}

async function cors(ctx, next) {
  ctx.body = ''
  let isCors = false
  const keys = Object.keys(ctx.request.headers)
  keys.forEach((k) => {
    log(`header: ${k}`)
    if (/^access-control-|^origin/i.test(k)) {
      isCors = true
      ctx.set('Vary', 'Origin')
      ctx.set('Access-Control-Allow-Origin', '*')
    }
    log('no cors here, mate')
  })
  if (isCors) {
    log('CORS! AaaHaa!')
    ctx.body += 'CORS!\n'
    ctx.body += '-----'
    ctx.body += '\n'
    ctx.body += '\n'
  }
  await next()
}

// session? cookie?
async function sessionViews(ctx, next) {
  await next()
  if (/favicon/.test(ctx.path)) return
  const n = ctx.session.views || 0
  ctx.session.views = n + 1
  ctx.cookies.set('views', ctx.session.views)
}

// checking to see if mongodb client is working
async function isMongo(ctx, next) {
  const { client, ObjectId } = mongoClient
  const db = client.db()
  const users = db.collection('users')
  let user1 = 'this should not show up anywhere'
  user1 = await users.findOne({ _id: ObjectId('6264b5f610cbb8a2af7e6a8a') })
  log(user1)
  ctx.state.user1 = user1
  await next()
}

app.use(cors)
app.use(logging)
app.use(xResponseTime)
app.use(response)
app.use(sessionViews)
app.use(isMongo)
app.use(main.routes())

app.listen(port)
