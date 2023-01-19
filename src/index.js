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
import { index } from './routes/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(`${__dirname}/..`)
dotenv.config({ path: path.resolve(root, '.env'), debug: true })

const log = Debug('koa-stub:log')
const error = Debug('koa-stub:error')

export const app = new Koa.default()
app.env = process.env.APP_ENV || 'development'
app.proxy = true
app.root = root
app.publicDir = `${root}/public`
app.templateName = 'default'
app.uploadsDir = `${root}/uploads`
app.use(serve(app.publicDir))

const port = process.env.PORT || 3333
const key1 = process.env.KEY1
const key2 = process.env.KEY2
const key3 = process.env.KEY3
app.keys = new Keygrip([key1, key2, key3])

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
  // await ctx.render('template', { body: ctx.body })
}

// x-response-time
async function xResponseTime(ctx, next) {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  ctx.set('X-Response-Time', `${ms}`)
}

// response
async function response(ctx) {
  if (ctx.body === '') {
    ctx.body = 'hellow orld!'
  } else {
    ctx.body += 'hellow orld!'
  }
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
  if (cors) {
    log('CORS! AaaHaa!')
    ctx.body += 'CORS!\n'
    ctx.body += '-----'
    ctx.body += '\n'
    ctx.body += '\n'
  }
  await next()
}

// app.use(cors)
// app.use(logging)
// app.use(xResponseTime)
// app.use(response)
app.use(index.routes())

app.listen(port)
