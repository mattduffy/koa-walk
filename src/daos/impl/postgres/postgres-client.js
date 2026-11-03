/**
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @summary The low-level connection object of postgres - using the postgres.js package.
 * @file src/daos/imple/postgres/postgres-client.js
 */

import path from 'node:path'
// import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import * as Dotenv from 'dotenv'
import postgres from 'postgres'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(`${__dirname}/../../../..`)
console.log('postgres-client.js >>root = ', root)
const showDebug = process.env.NODE_ENV !== 'production'
const psqlEnv = {}
Dotenv.config({
  path: path.resolve(root, 'config/postgres.env'),
  processEnv: psqlEnv,
  debug: showDebug,
})
// console.log(psqlEnv)
const sql = postgres({
  host: psqlEnv.PGHOST,
  port: psqlEnv.PGPORT,
  database: psqlEnv.PGDATABASE,
  username: psqlEnv.PGUSER,
  password: psqlEnv.PGPASSWORD,
  connection: {
    application_name: 'walk',
  },
})

export { sql }
