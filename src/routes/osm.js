/**
 * @summary Koa router for the openstreetmap queries.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @description The router for the openstreetmap query URLs.
 * @file src/routes/osm.js
 */

import Router from '@koa/router'
import { ulid } from 'ulid'
import { ObjectId } from 'mongodb'
import { _log, _error } from '../utils/logging.js'
import { redis } from '../daos/impl/redis/redis-client.js'
import {
  addIpToSession,
  doTokensMatch,
  processFormData,
  hasFlash,
} from './middlewares.js'

const osmLog = _log.extend('walk')
const osmError = _error.extend('walk')
/* eslint-disable-next-line no-unused-vars */
function sanitize(param) {
  // fill in with some effective input scubbing logic
  if (!param) osmError('missing param')
  return param
}

const router = new Router()
router.post('discoverPost', '/api/v1/osm/trails/:radius/:type', async (ctx) => {
  ctx.status = 418
})

router.put('discoverPut', '/api/v1/osm/trails/:radius/:type', async (ctx) => {
  ctx.status = 418
})

router.get('discover', '/api/v1/osm/trails/:radius/:type', async (ctx) => {
  ctx.type = 'application/json; charset=utf-8'
  ctx.body = {
    meta: {
      generatedAt: new Date(),
      source: 'osm',
      cached: false,
      pageination: {
        total: 10,
        offset: 1,
        limit: 5,
        totalPages: 2,
      },
    },
    data: [
      {
        id: 1,
        name: 'Boggy Rogers',
        state: 'CA',
        startLocation: [37.83573, -122.18447], // lat/lon
        startElevation: null,
        difficulty: null,
        length: null,
      },
    ],
  }
})

export { router as osm }
