/**
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/index.js The entry point to set up a koa test app.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Debug from 'debug'
import * as Koa from 'koa'
import Keygrip from 'keygrip'
import render from '@koa/ejs'
import * as dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '.env'), debug: true })

const log = Debug('koa-stub:log')
const error = Debug('koa-stub:error')

export const app = new Koa.default()
const port = process.env.PORT || 3333
const key1 = process.env.KEY1
const key2 = process.env.KEY2
const key3 = process.env.KEY3
app.keys = new Keygrip([key1, key2, key3])
app.proxy = true

render(app, {
  // root: path.join(__dirname, 'views'),
  root: path.resolve(`${__dirname}/..`, 'views'),
  layout: 'template',
  viewExt: 'html',
  cache: false,
  debug: true,
  delimter: '%',
  async: true,
})

// logging
async function logging(ctx, next) {
  await next()
  const rt = ctx.response.get('X-Response-Time')
  log(`${ctx.method} ${ctx.url} - ${rt}`)
  await ctx.render('template', { body: ctx.body })
}

// x-response-time
async function xResponseTime(ctx, next) {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  ctx.set('X-Response-Time', `${ms}`)
}
//
// response
async function response(ctx) {
  if (ctx.body === '') {
    ctx.body = 'hellow orld!'
  } else {
    ctx.body += 'hellow orld!'
  }
  log(`${ctx.request.hostname}`)
  log(`${ctx.request.host}`)
  log(`app.proxy: ${app.proxy}`)
  log(ctx.request.header)
  log(ctx.request.origin)
  ctx.response.body += '\nnot today, buddy.'
  log(ctx.response.body)
  log(ctx.app === app)
}

async function cors(ctx, next) {
  ctx.body = ''
  let cors = false
  const keys = Object.keys(ctx.request.headers)
  keys.forEach((k) => {
    log(`header: ${k}`)
    if (/^access-control-|^origin/i.test(k)) {
      cors = true
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

app.use(cors)
app.use(logging)
app.use(xResponseTime)
app.use(response)

app.listen(port)
