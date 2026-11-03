/**
 * @summary Koa router for the openstreetmap queries.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @description The router for the openstreetmap query URLs.
 * @file src/routes/osm.js
 */

import Router from '@koa/router'
// import { ulid } from 'ulid'
// import { ObjectId } from 'mongodb'
import { _log, _error } from '../utils/logging.js'
import { sql } from '../daos/impl/postgres/postgres-client.js'
import {
  // addIpToSession,
  // doTokensMatch,
  processFormData,
  // hasFlash,
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

router.post(
  'discoverPost',
  '/api/v1/osm/trails/:type/:lon/:lat/:radius{/:page}',
  async (ctx) => {
    ctx.status = 418
  },
)

router.put(
  'discoverPut',
  '/api/v1/osm/trails/:type/:lon/:lat/:radius{/:page}',
  async (ctx) => {
    ctx.status = 418
  },
)

router.get(
  'discover',
  '/api/v1/osm/trails/:type/:lon/:lat/:radius{/:page}',
  processFormData,
  async (ctx) => {
    osmLog(ctx.params)
    let type
    if (!/^hiking$/i.test(ctx.params.type)) {
      ctx.throw(400, 'Invalide type value.')
    } else {
      type = 'hiking'
    }
    let longitude
    if (!/^[+-]?[\d]{1,3}.[\d]{1,}$/.test(ctx.params.lon)) {
      ctx.throw(400, 'Invalid longitude value.')
    } else {
      longitude = ctx.params.lon
    }
    let latitude
    if (!/^[+-]?[\d]{1,3}.[\d]{1,}$/.test(ctx.params.lat)) {
      ctx.throw(400, 'Invalid latitude value.')
    } else {
      latitude = ctx.params.lat
    }
    let radiusMeters
    const n = Number.parseInt(ctx.params.radius, 10)
    if (Number.isNaN(n)) {
      ctx.throw(400, 'Invalid search radius distance value.')
    } else {
      radiusMeters = Number.parseInt(n * 1.609 * 1000, 10) // convert miles to km
    }
    let page
    const p = Number.parseInt(ctx.params.page, 10)
    if (Number.isNaN(p)) {
      page = 1
    } else {
      page = (Math.abs(p) === 0) ? 1 : Math.abs(p)
    }
    const limit = 10
    osmLog(type)
    osmLog(longitude)
    osmLog(latitude)
    osmLog(radiusMeters)
    osmLog(page)
    // const longitude = -122.20888
    // const latitude = 37.824673
    // // 1 mile equals 1.609 kilometers
    // // 1 kilometer equals 0.621371 miles
    // const radiusMeters = (25 * 1.609) * 1000 // convert 25 miles to meters
    let body = {
      meta: {
        generatedAt: new Date(),
        source: 'osm',
        cached: false,
        pagination: {
          totalTrails: 0,
          offset: 0,
          limit: 0,
          totalPages: 0,
        },
      },
      data: [],
    }

    try {
      const trails = await sql`
        WITH matched_relations AS (
          SELECT 
             r.id AS relation_id,
             r.tags->>'name' AS route_name,
             r.tags AS relation_tags,
             -- Calculate the min distance from location to any member way of this relation
             MIN(ST_Distance(
                 l.way,
                 ST_Transform(ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326), 3857)
             )) AS distance_meters
          FROM 
              planet_osm_rels r
          JOIN LATERAL unnest(planet_osm_member_ids(r.members, 'W')) AS way_id ON true
          JOIN (
              SELECT osm_id, way FROM planet_osm_line
              UNION ALL
              SELECT osm_id, way FROM planet_osm_roads
          ) l ON l.osm_id = way_id
          WHERE 
              r.tags->>'route' = ${type} 
          GROUP BY 
              r.id, r.tags
          HAVING 
              MIN(ST_Distance(
                  l.way,
                  ST_Transform(ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326), 3857)
              )) <= ${radiusMeters}
        )
        SELECT 
            relation_id,
            route_name,
            relation_tags,
            ROUND(distance_meters::numeric, 2) AS distance_meters,
            COUNT(*) OVER() AS total_count -- Returns total matching rows across all pages
        FROM 
            matched_relations
        ORDER BY 
            distance_meters ASC
        LIMIT ${limit} 
        OFFSET ( (${page} - 1) * 10 );
      `
      osmLog(`found ${trails.length} hiking trails.`)
      body.data = trails
      body.meta.pagination.totalTrails = trails[0].total_count
      body.meta.pagination.limit = limit
      body.meta.pagination.offset = ((page - 1) * 10)
      body.meta.pagination.currentPage = page
      body.meta.pagination.totalPages = Math.ceil(trails[0].total_count / limit)
    } catch (e) {
      body = { status: 'query failed', msg: e.toString() }
    }
    ctx.type = 'application/json; charset=utf-8'
    ctx.body = body
  },
)

export { router as osm }
