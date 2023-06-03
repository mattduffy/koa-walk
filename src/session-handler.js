/**
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @file src/session-handler.js The setup and configuration of the koa app session handler.
 */

// import fs from 'node:fs/promises'
import fs from 'node:fs'
import session from 'koa-session'
import redisStore from 'koa-redis'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(`${__dirname}/..`)
const showDebug = process.env.NODE_ENV !== 'production'
dotenv.config({ path: path.resolve(root, 'config/sessions.env'), debug: showDebug })

// console.log('cacert: %o', process.env.REDIS_CACERT)

const sentinelPort = process.env.SENTINEL_PORT || 36379
const redisConnOpts = {
  sentinels: [
    { host: process.env.REDIS_SENTINEL_01, port: sentinelPort },
    { host: process.env.REDIS_SENTINEL_02, port: sentinelPort },
    { host: process.env.REDIS_SENTINEL_03, port: sentinelPort },
  ],
  name: 'myprimary',
  db: process.env.REDIS_DB,
  sentinelUsername: process.env.REDIS_SENTINEL_USER,
  sentinelPassword: process.env.REDIS_SENTINEL_PASSWORD,
  username: process.env.REDIS_USER,
  password: process.env.REDIS_PASSWORD,
  connectionName: 'koa-sessions',
  // keyPrefix: 'koasessions:',
  keyPrefix: `${process.env.REDIS_KEY_PREFIX}:sessions:` ?? 'koa:sessions:',
  enableTLSForSentinelMode: true,
  sentinelRetryStrategy: 100,
  tls: {
    ca: fs.readFileSync(process.env.REDIS_CACERT),
    rejectUnauthorized: false,
    requestCert: true,
  },
  sentinelTLS: {
    ca: fs.readFileSync(process.env.REDIS_CACERT),
    rejectUnauthorized: false,
    requestCert: true,
  },
}
const redis = redisStore(redisConnOpts)

const config = {
  key: 'session',
  maxAge: 86400000,
  autoCommit: true,
  overwrite: true,
  httpOnly: true,
  signed: true,
  rolling: false,
  renew: false,
  secure: false,
  sameSite: true,
  store: redis,
}

export { session, config, redis }
