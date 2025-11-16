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
    .option('--pandolf', 'The Pandolf equation for calorie estimation.')
    .option('-t, --test', 'Dry run the calorie calculations.  Do not save results.')

  program.parse(process.argv)
  options = program.opts()
  log('process.argv', process.argv)
  log('command options: ', options)

} catch (e) {
  error(e)
}
const MET = 7.5
const BODY_WEIGHT = options.bodyWeight / 2.2
const RUCK_WEIGHT = (options?.ruckWeight / 2.2) || 0
const COMBINED = BODY_WEIGHT + RUCK_WEIGHT
log('hiking MET', MET)
log(`body weight in lbs: ${options.bodyWeight} (kgs: ${BODY_WEIGHT})`) 
log(`ruck weight in lbs: ${options.ruckWeight} (kgs: ${RUCK_WEIGHT})`)
log(`combined weight in kgs: ${COMBINED}`)

/**
 * @summary The simplest calorie estimating function.  No account is given for
 * terrain type, gps factors (hill grading), uphill vs downhill efforts, etc.
 * MET - ratio of energy spent per unit time during a specific physical activity to a
 * reference value of 3.5 ml O₂/(kg·min).
 * Metabolic Equivalent Task (Hiking):
 *  MET = 7.5 (7.0 for backpacking or general weight lifting has a MET of 3.5)
 *  Calories Burned Per Minute: 𝐶𝑎𝑙𝑜𝑟𝑖𝑒𝑠/𝑚𝑖𝑛 = (MET * 3.5 * Weight in kg) / 200
 *  Ttl Calories Burned: 𝑇𝑜𝑡𝑎𝑙𝐶𝑎𝑙𝑜𝑟𝑖𝑒𝑠𝐵𝑢𝑟𝑛𝑒𝑑 = (MET * 3.5 * Weight in kg) / 200 * minutes
 * How to use:
 * Weight: Your body weight plus the weight of your ruck/pack.
 * Convert to kg if needed (1 lb≈0.4536 kg).
 * Duration: The total time spent hiking/rucking, in minutes.
 * @author Matthew Duffy <mattduffy@gmail.com> 
 * @param Number minutes - Time spent expending energy, in minutes.
 * @param Number MET - The metabolic equivalent task number.
 * @return Number - Estimated calories used per duration of MET.
 */
function simple(minutes, MET = 7.5) {
  log('calculating simple EE method')
  return ((MET * 3.5 * COMBINED) / 200) * minutes
}

/**
 * @summary The Pandolf equation for estimating energy expenditure.
 * This equation is more complex but includes factors like terrain grade.
 * M = 1.5W + 2.0 * (W + L) * (L / W) + n * (W + L) * (1.5V + 0.35VG)
 * Where:
 * M = Metabolic rate (calories per minute)
 * W = Body weight
 * L = Load carried (weight of the ruck)
 * V = Speed
 * G = Grade of incline (e.g., 0 for flat, 1 for 100%)
 * n = Terrain factor (e.g., 1.0 for pavement, or higher for sand/brush)
 * @author Matthew Duffy <mattuffy@gmail.com>
 * @param Number MET - The metabolic equivalent task number.
 * @return 
 */
function pandolf(M = 7.5, W, L, V, G, n = 1.2) {
  log('calculating Pandolf equation for calories used.')
  // 1.5W + 2.0(W + L)(L/W) + n(W + L)(1.5V + 0.35VG)
  return (1.5 * W) + (2.0 * (W + L)) * (L / W) + ((n * (W + L)) * ((1.5 * V) + (0.35 * V) * G))
}

// log(mongoClient)
const walks = mongoClient.client.db().collection('walks')
let ruck
let _id
let simpleCalories
let pandolfCalories = Array()
try {
  _id = new mongoClient.ObjectId(options._id)
  ruck = await walks.findOne({_id})
  log(ruck.features[0].properties)
  // Stored duration is milliseconds.
  // Convert to minutes: duration / 1000 / 60 (plus duration / 1000 % 60 for remaining seconds)
  const minutes = Math.floor(((ruck.features[0].properties.duration / 1000) / 60))
  if (options?.simple) {
    simpleCalories = simple(minutes)
    log(Math.round(simpleCalories))
  }
  if (options?.pandolf) {
    let start
    let milliseconds = 0
    let ruckSteps = Array()
    let ruckFull= Array()
    const TEN_SECONDS = 10000
    let miniSteps = 0
    let ts = ruck.features[0].properties.timestamps
    ts.forEach((t, i) => {
      if (i === 0) {
        start = t
      }
      // collect each timestamp while seconds <= 10000 into steps array.
      // once seconds reaches 10000, push steps array into parent array, rest steps and seconds
      // parent[
      //  steps[
      //   {0, ts[0], seconds = 1},
      //   {1, ts[1], seconds = 2},
      //   ...
      //   {9, ts[9], seconds = 10},
      //  ],
      //  steps[
      //   {10, ts[10], seconds = 1},
      //   {11, ts[11], seconds = 2},
      //   ...
      //   {19, ts[19], seconds = 10},
      //  ],
      //  ...
      //  steps[],
      //  steps[]
      // ]
      //
      if (t - start <= TEN_SECONDS) {
        log(`t ${t} - start ${start} = ${t - start}`)
        milliseconds += ts[i] - (ts[(i < 1 ? 0 : i - 1)]) 
        log(
          `milliseconds ${milliseconds} = `
          + `ts[${i}] ${ts[i]} - ts[${(i < 1 ? 0 : i - 1)}] ${ts[(i < 1 ? 0 : i - 1)]}`
        )
        miniSteps += 1
        let step = {
          index: i,
          timestamp: t,
          seconds: milliseconds / 1000,
          miniSteps,
        }
        ruckSteps.push(step)
        log(`adding ${miniSteps} `, step)
      } else {
        log('resetting step', 'index', i)
        ruckFull.push(ruckSteps)
        ruckSteps = Array()
        miniSteps += 1
        let step = {
          index: i,
          timestamp: t,
          seconds: (milliseconds / 1000),
          miniSteps,
        }
        log(step)
        ruckSteps.push(step)
        log(`adding ${miniSteps} `, step)
        miniSteps = 0
        milliseconds = 0
        start = ts[i]
      }
      // pandolfCalories.push(pandolf())
      
    })
    console.log(ruckFull)
    // console.table(ruckSteps)
    // log(Math.round(pandolfCalories))
  }
} catch (e) {
  error(e)
}
// Done creating new user account, exit process.
process.exit()
