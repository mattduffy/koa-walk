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

// logging
async function logging(ctx, next) {
  await next()
  const rt = ctx.response.get('X-Response-Time')
  log(`${ctx.method} ${ctx.url} - ${rt}`)
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
  ctx.body = 'hellow orld!'
  log(`${ctx.request.hostname}`)
  log(`${ctx.request.host}`)
  log(`app.proxy: ${app.proxy}`)
  log(ctx.request.header)
  log(ctx.request.origin)
  ctx.response.body += '\nnot today, buddy.'
  log(ctx.response.body)
  log(ctx.app === app)
}

async function cors(ctx) {
  const keys = Object.keys(ctx.request.headers)
  keys.forEach((k) => {
    if (/^access-control|^origin$/i.test(k)) {
      return ctx.body = 'CORS!'
    }
  })
}

app.use(cors)
app.use(logging)
app.use(xResponseTime)
app.use(response)

app.listen(port)
