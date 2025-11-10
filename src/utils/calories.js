/**
 * @module @mattduffy/koa-glp
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @summary The script to calculate calories from a ruck.
 * @file src/utils/calories.js
 */

import path from 'node:path'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import * as mongoClient from '../daos/impl/mongodb/mongo-client.js'
import { _log, _error } from './logging.js'

const log = _log.extend('utils:calories')
const error = _error.extend('utils:calories')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appRoot = path.resolve(`${__dirname}/../..`)
const appEnv = {}
log(`appRoot: ${appRoot}`)
dotenv.config({ path: path.resolve(appRoot, 'config/app.env'), processEnv: appEnv })

const program = new Command()
program.name('newUser')
  .requiredOption('--_id <_id>', 'ObjectId from db of ruck to calculate calories.')
  .option('--method <method>', 'The method of calorie estimation to use.')
  .option('-t, --test', 'Dry run the calorie calculations.')

program.parse(process.argv)
const options = program.opts()
// log(process.argv)
log('options: ', options)

const confEnv = {}
if (options?.conf) {
  dotenv.config({ path: path.resolve(appRoot, options.conf), processEnv: confEnv })
}
let email = confEnv?.email ?? options?.email ?? 'new_user@genevalakepiers.com'
if (options?.test === true) {
  const rando = crypto.randomBytes(2).toString('hex')
  const at = options.email.indexOf('@')
  email = `${options.email.slice(0, at)}-${rando}${options.email.slice(at)}`
}

const fName = confEnv?.FIRST_NAME ?? options?.first ?? 'Test'
const lName = confEnv?.LAST_NAME ?? options?.last ?? 'Test'
const password = confEnv?.PASSWORD ?? options?.password ?? null

const ctx = {
  app: {
    root: appRoot,
    dirs: {
      public: {
        dir: `${appRoot}/public`,
      },
      private: {
        dir: `${appRoot}/private`,
      },
    },
  },
}

const _id = new mongoClient.ObjectId()
log(`new mongo _id: ${_id}`)

const userProps = {
  _id,
  // first: options.first ?? 'First',
  first: fName,
  last: lName,
  emails: [{ primary: email, verified: false }],
  description: `A new (${(options?.test) ? 'test' : ''}) ${(options?.admin) ? 'admin' : 'user'} account created from the cli.`,
  username: `${fName.toLowerCase()}${lName.toLowerCase()}`,
  password,
  jwts: { token: '', refresh: '' },
  userStatus: 'active',
  schemaVer: 0,
  ctx,
  env: appEnv,
  dbName: mongoClient.dbName,
  client: mongoClient.client,
}

log(mongoClient.uri)
log('[newUser] DB credentials in use: %O', userProps.client.options.credentials)
log('[newUser] DB name in use: ', userProps.client.options.dbName)

let newUser
if (options.admin === true) {
  newUser = Users.newAdminUser(userProps)
} else {
  newUser = Users.newUser(userProps)
}
try {
  newUser.publicDir = 'a'
  // TODO Fix issue with assigning privateDir looses hashed account directory in path.
  // newUser.privateDir = 'a'
  const newUserKeys = await newUser.generateKeys()
  log(newUserKeys)
} catch (e) {
  error(e)
  throw new Error(e.message, { cause: e })
}
let savedNewUser
try {
  savedNewUser = await newUser.save()
  log(savedNewUser.privateDir)
} catch (e) {
  error(e)
  throw new Error(e.message, { cause: e })
}
// Done creating new user account, exit process.
process.exit()
