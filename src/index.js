/**
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/index.js The entry point to set up a koa test app.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _log, _error } from './utils/logging.js'
import * as Koa from 'koa'
import serve from 'koa-static'
import Keygrip from 'keygrip'
import render from '@koa/ejs'
import * as dotenv from 'dotenv'
import { migrations } from '@mattduffy/koa-migrations'
import { wellknownWebfinger, wellknownHostmeta, wellknownNodeinfo } from '@mattduffy/webfinger'
import * as mongoClient from './daos/impl/mongodb/mongo-client.js'
import { session, config } from './session-handler.js'
import {
  getSessionUser,
  flashMessage,
  prepareRequest,
  tokenAuthMiddleware,
  errorHandlers,
  errors,
} from './middlewares.js'
import { apiV1 } from './routes/api_v1.js'
import { activityV1 } from './routes/activity_stream.js'
import { auth as Auth } from './routes/auth.js'
import { main as Main } from './routes/main.js'
import { users as Users } from './routes/users.js'
import { account as Account } from './routes/account.js'

const log = _log.extend('index')
const error = _error.extend('index')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appRoot = path.resolve(`${__dirname}/..`)
const showDebug = process.env.NODE_ENV !== 'production'
dotenv.config({ path: path.resolve(appRoot, 'config/app.env'), debug: showDebug })
dotenv.config({ path: path.resolve(appRoot, 'config/test.env'), debug: showDebug })

const key1 = process.env.KEY1
const key2 = process.env.KEY2
const key3 = process.env.KEY3
const port = process.env.PORT ?? 3333

export const app = new Koa.default()
app.keys = new Keygrip([key1, key2, key3])
app.env = process.env.APP_ENV ?? 'development'
app.site = process.env.SITE_NAME ?? 'Web site'
app.host = `${process.env.HOST}:${port}` ?? `127.0.0.1:${port}`
// app.host = `${process.env.HOST}` ?? '127.0.0.1'
app.domain = process.env.DOMAIN_NAME ?? 'website.com'
app.proxy = true
app.root = appRoot
app.templateName = 'default'
app.publicDir = `${appRoot}/public`
app.uploadsDir = `${appRoot}/uploads`
process.env.UPLOADSDIR = app.uploadsDir

const o = {
  db: path.resolve(`${app.root}/src`, 'daos/impl/mongodb/mongo-client.js'),
  db_name: process.env.MONGODB_DBNAME ?? 'test',
}
app.use(session(config, app))
if (app.env === 'development') {
  app.use(migrations(o, app))
}

render(app, {
  root: `${appRoot}/views/${app.templateName}`,
  layout: 'grid-template',
  viewExt: 'ejs',
  cache: false,
  debug: true,
  delimter: '%',
  async: true,
})

// x-response-time
async function xResponseTime(ctx, next) {
  const start = Date.now()
  try {
    await next()
    const ms = Date.now() - start
    ctx.set('X-Response-Time', `${ms}`)
    log(`${ctx.method} ${ctx.url} - ${ms}`)
    // log('session: %o', ctx.session)
  } catch (e) {

  }
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
  const n = ctx.session?.views ?? 0
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
  try {
    await next()
  } catch (e) {
    // ctx.app.emit('error', 'Failed after setting CORS headers.', ctx)
    // ctx.app.emit('error', e, ctx)
  }
}

// checking to see if mongodb client is working
async function isMongo(ctx, next) {
  const { client, ObjectId } = mongoClient
  ctx.state.mongodb = mongoClient
  try {
    await next()
  } catch (e) {
    // ctx.app.emit('error', 'Failed to get db connection setup.', ctx)
  }
}

app.use(errors)
app.use(isMongo)
app.use(getSessionUser)
app.use(flashMessage({}, app))
app.use(prepareRequest())
app.use(tokenAuthMiddleware())
app.use(cors)
app.use(wellknownNodeinfo({}, app))
app.use(wellknownHostmeta({}, app))
app.use(wellknownWebfinger({}, app))
// app.use(xResponseTime)
// app.use(sessionViews)
// app.use(logging)
app.use(serve(app.publicDir))
app.use(Auth.routes())
app.use(Main.routes())
app.use(Users.routes())
app.use(Account.routes())
app.use(activityV1.routes())
app.use(apiV1.routes())

app.on('error', async (err, ctx) => {
  error(ctx)
  error('\n')
  error(err)
  error('***********************************')
})

app.listen(port)
