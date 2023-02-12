/**
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/index.js The entry point to set up a koa test app.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Debug from 'debug'
import * as Koa from 'koa'
// import { koaBody } from 'koa-body'
import serve from 'koa-static'
import Keygrip from 'keygrip'
import render from '@koa/ejs'
import * as dotenv from 'dotenv'
import * as mongoClient from './daos/impl/mongodb/mongo-client.js'
import { session, config } from './session-handler.js'
import { wellknownWebfinger } from '@mattduffy/webfinger'
import { getSessionUser, flashMessage, errorHandlers } from './middlewares.js'
import { apiV1 } from './routes/api_v1.js'
import { auth as Auth } from './routes/auth.js'
import { main as Main } from './routes/main.js'
import { users as Users } from './routes/users.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appRoot = path.resolve(`${__dirname}/..`)
const showDebug = process.env.NODE_ENV !== 'production'
dotenv.config({ path: path.resolve(appRoot, 'config/app.env'), debug: showDebug })

const log = Debug('koa-stub:index_log')
const error = Debug('koa-stub:index_error')

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
app.root = appRoot
app.publicDir = `${appRoot}/public`
app.templateName = 'default'
app.uploadsDir = `${appRoot}/uploads`

// app.use(koaBody())
app.use(session(config, app))

render(app, {
  root: `${appRoot}/views/${app.templateName}`,
  layout: 'template',
  viewExt: 'ejs',
  cache: false,
  debug: true,
  delimter: '%',
  async: true,
})

// x-response-time
async function xResponseTime(ctx, next) {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  ctx.set('X-Response-Time', `${ms}`)
  log(`${ctx.method} ${ctx.url} - ${ms}`)
  // log('session: %o', ctx.session)
}

// logging
async function logging(ctx, next) {
  log('ctx.state: %o', ctx.state)
  await next()
}

// session? cookie?
async function sessionViews(ctx, next) {
  await next()
  if (!ctx.session) return
  if (/favicon/.test(ctx.path)) return
  const n = ctx.session?.views || 0
  ctx.session.views = n + 1
  ctx.cookies.set('views', ctx.session.views)
}

async function cors(ctx, next) {
  const keys = Object.keys(ctx.request.headers)
  keys.forEach((k) => {
    // log(`header: ${k} : ${ctx.request.headers[k]}`)
    if (/^access-control-|origin/i.test(k)) {
      ctx.set('Vary', 'Origin')
      ctx.set('Access-Control-Allow-Origin', '*')
    }
  })
  ctx.set('Vary', 'Origin')
  ctx.set('Access-Control-Allow-Origin', '*')
  ctx.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  ctx.set('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS')
  await next()
}

// checking to see if mongodb client is working
async function isMongo(ctx, next) {
  const { client, ObjectId } = mongoClient
  ctx.state.mongodb = mongoClient
  // const db = client.db()
  // const users = db.collection('users')
  // let user = 'this should not show up anywhere'
  // user = await users.findOne({ _id: ObjectId('6264b5f610cbb8a2af7e6a8a') })
  // if (!user) {
  //   error('Error in isMongo middleware function.')
  // }
  // ctx.state.user = user
  await next()
}

app.use(isMongo)
app.use(flashMessage({}, app))
app.use(wellknownWebfinger({}, app))
app.use(getSessionUser)
app.use(cors)
app.use(xResponseTime)
app.use(sessionViews)
app.use(logging)
app.use(apiV1.routes())
app.use(Auth.routes())
app.use(Main.routes())
app.use(Users.routes())
app.use(serve(app.publicDir))
app.use(errorHandlers)

app.on('error', (err, ctx) => {
  error(err)
  const locals = {
    title: `${ctx.app.site}: 500`,
    body: ctx.body,
    user: ctx.state.user,
    isAuthenticated: ctx.state.isAuthenticated,
  }
  ctx.render('500', locals)
})

app.listen(port)
