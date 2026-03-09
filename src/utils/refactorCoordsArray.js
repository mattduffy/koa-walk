/**
 * @module @mattduffy/koa-glp
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @summary The script to refactor the geojson coordinates array to include enriched values.
 * @file src/utils/refactorCoordsArray.js
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

let program
let options
try {
  program = new Command()
  program.name('newUser')
    .option('-1 --just-one', 'Just grab the first walk geojson doc.')
    .option('-t, --test', 'Dry run the calorie calculations.  Do not save results.')

  program.parse(process.argv)
  options = program.opts()
  log('process.argv', process.argv)
  log('command options: ', options)
} catch (e) {
  error(e)
}
let rucks
try {
  const walks = mongoClient.client.db().collection('walks')
  const query = { 'features.properties.version': { $gt: 0 } }
  if (options?.justOne) {
    rucks = [await walks.findOne(query)]
  } else {
    rucks = await walks.find(query).sort({ 'features.properties.date': -1 }).toArray()
  }
  /**
   * coordinates array elements are in this order:
   * [ longitude, latitude, heading, altitude, accuracy, timestamp ]
   *
   */
  rucks.forEach((r, i) => {
    log(
      i,
      r.features[0].properties.version,
      r.features[0].properties.name,
      r.features[0].properties.distance,
      r.features[0].geometry.coordinates[0],
    )
  })
} catch (e) {
  error(e)
}
// Done creating new user account, exit process.
process.exit()
