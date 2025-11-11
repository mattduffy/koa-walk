/**
 * @module @mattduffy/koa-glp
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @summary The script to calculate estimated energy expenditure from a ruck.
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

let program
let options
try {
  program = new Command()
  program.name('newUser')
    .requiredOption('--_id <_id>', 'ObjectId from db of ruck to calculate calories.')
    .requiredOption('--body-weight <weight>', 'Body weight, in lbs.')
    .option('--ruck-weight <weight>', 'Ruck weight, in lbs.')
    .option('--simple', 'The simple method of calorie estimation.')
    .option('-t, --test', 'Dry run the calorie calculations.  Do not save results.')

  program.parse(process.argv)
  options = program.opts()
  log('process.argv', process.argv)
  log('command options: ', options)

} catch (e) {
  error(e)
}
const MET = 6
const BODY_WEIGHT = options.bodyWeight / 2.2
const RUCK_WEIGHT = (options?.ruckWeight / 2.2) || 0
const COMBINED = BODY_WEIGHT + RUCK_WEIGHT
log('hiking MET', MET)
log(`body weight in lbs: ${options.bodyWeight} (kgs: ${BODY_WEIGHT})`) 
log(`ruck weight in lbs: ${options.ruckWeight} (kgs: ${RUCK_WEIGHT})`)
log(`combined weight in kgs: ${COMBINED}`)
function simple(minutes) {
  log('calculating simple EE method')
  return ((MET * 3.5 * COMBINED) / 200) * minutes
}

// log(mongoClient)
const walks = mongoClient.client.db().collection('walks')
let ruck
let _id
let simpleCalories
try {
  _id = new mongoClient.ObjectId(options._id)
  ruck = await walks.findOne({_id})
  log(ruck.features[0].properties)
  // Stored duration is milliseconds.
  // Convert to minutes duration / 1000 / 60 (plus duration / 1000 % 60 for remaining seconds)
  const minutes = Math.floor(((ruck.features[0].properties.duration / 1000) / 60))
  if (options?.simple) {
    simpleCalories = simple(minutes)
    log(Math.round(simpleCalories))
  }
} catch (e) {
  error(e)
}
// Done creating new user account, exit process.
process.exit()
