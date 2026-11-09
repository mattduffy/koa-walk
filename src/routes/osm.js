/**
 * @summary Koa router for the openstreetmap queries.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @description The router for the openstreetmap query URLs.
 * @file src/routes/osm.js
 */

import Router from '@koa/router'
import { ulid } from 'ulid'
// import { ObjectId } from 'mongodb'
import { _log, _error } from '../utils/logging.js'
import { sql } from '../daos/impl/postgres/postgres-client.js'
import {
  addIpToSession,
  doTokensMatch,
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

router.use(async (ctx, next) => {
  ctx.startTime = Date.now()
  await next()
})

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

router.delete(
  'discoverPut',
  '/api/v1/osm/trails/:type/:lon/:lat/:radius{/:page}',
  async (ctx) => {
    ctx.status = 418
  },
)

router.get(
  'discover',
  '/api/v1/osm/trails/:type/:lon/:lat/:radius{/:page}',
  addIpToSession,
  processFormData,
  async (ctx) => {
    const log = osmLog.extend('search')
    log('params', ctx.params)
    log('body', ctx.request.body)
    const [csrfTokenHidden] = ctx.request.body.csrfTokenHidden ?? '0000'
    osmLog(`csrfTokenHidden: ${csrfTokenHidden}`)
    const newCsrfToken = ulid()
    if (doTokensMatch(ctx)) {
      ctx.session.csrfToken = newCsrfToken
      ctx.cookies.set('csrfToken', newCsrfToken, { httpOnly: true, sameSite: 'strict' })
      let type
      const match = /^(?<type>hiking|walking|running|fitness_trail|foot)$/i
        .exec(ctx.params.type)
      if (!match) {
        ctx.throw(400, 'Invalid type value.')
      } else {
        type = match.groups.type
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
        // radiusMeters = Number.parseInt(n, 10) // value already in meters
        radiusMeters = Number.parseInt(n * 1.609 * 1000, 10) // convert miles to meters
      }
      let page
      const p = Number.parseInt(ctx.params.page, 10)
      if (Number.isNaN(p)) {
        page = 1
      } else {
        page = (Math.abs(p) === 0) ? 1 : Math.abs(p)
      }
      const limit = 10
      osmLog('trail type', type)
      osmLog('longitude', longitude)
      osmLog('latitude', latitude)
      osmLog('radiusMeters', radiusMeters)
      osmLog('page', page)
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
        /* eslint-disable prefer-template */
        const trails = await sql`
          WITH nearby_ways AS (
            -- Step 1: Use ST_DWithin first. This forces PostgreSQL to use the GiST 
            -- spatial index via bounding boxes, instantly filtering out distant ways.
            SELECT osm_id, way 
            FROM planet_osm_line
            WHERE ST_DWithin(
              way, 
              ST_Transform(ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326), 3857), 
              ${radiusMeters}
            )
            UNION ALL
            SELECT osm_id, way 
            FROM planet_osm_roads
            WHERE ST_DWithin(
              way, 
              ST_Transform(ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326), 3857), 
              ${radiusMeters}
            )
          ),
          matched_relations AS (
            -- Step 2: Map those nearby ways back to their parent relations
            SELECT 
              r.id AS relation_id,
              r.tags->>'name' AS route_name,
              r.tags AS relation_tags,
              MIN(ST_Distance(
                nw.way,
                ST_Transform(ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326), 3857)
              )) AS distance_meters
            FROM 
              planet_osm_rels r
            JOIN LATERAL unnest(planet_osm_member_ids(r.members, 'W')) AS way_id ON true
            JOIN nearby_ways nw ON nw.osm_id = way_id
            WHERE 
              (r.tags->>'route' LIKE ${'%' + type + '%'} OR r.tags->>'route' LIKE '%foot%')
            GROUP BY 
              r.id, r.tags
          ),
          paginated AS (
            SELECT 
              relation_id,
              route_name,
              relation_tags,
              distance_meters,
              COUNT(*) OVER() AS total_count
            FROM 
              matched_relations
            ORDER BY 
              distance_meters ASC
            LIMIT 10
            OFFSET ( (${page} - 1) * 10 )
          )
          SELECT 
            p.relation_id,
            p.route_name,
            p.relation_tags,
            ROUND(p.distance_meters::numeric, 2) AS distance_meters,
            p.total_count,
            (
              SELECT array_agg(node_id ORDER BY m.ord, node_idx)
              FROM planet_osm_rels r2
              CROSS JOIN LATERAL jsonb_array_elements(r2.members) WITH ORDINALITY AS m(elem, ord)
              JOIN planet_osm_ways w ON w.id = (elem->>'ref')::bigint
              CROSS JOIN LATERAL unnest(w.nodes) WITH ORDINALITY AS n(node_id, node_idx)
              WHERE r2.id = p.relation_id AND elem->>'type' = 'W'
            ) AS sequenced_node_ids
          FROM 
            paginated p
          ORDER BY 
            p.distance_meters ASC;
        `
        /* eslint-enable prefer-template */
        osmLog(`found ${trails.length} hiking trails.`)
        body.data = trails
        if (trails.length < 1) {
          body.meta.pagination.totalTrails = 0
          body.meta.pagination.limit = limit
          body.meta.pagination.offset = 0
          body.meta.pagination.currentPage = 1
          body.meta.pagination.totalPages = 0
        } else {
          body.meta.pagination.totalTrails = trails[0].total_count
          body.meta.pagination.limit = limit
          body.meta.pagination.offset = ((page - 1) * 10)
          body.meta.pagination.currentPage = page
          body.meta.pagination.totalPages = Math.ceil(trails[0].total_count / limit)
          body.meta.request_duration_milliseconds = Date.now() - ctx.startTime
        }
      } catch (e) {
        body = { status: 'query failed', msg: e.toString() }
      }
      ctx.type = 'application/json; charset=utf-8'
      ctx.body = body
    } else {
      ctx.session.csrfToken = newCsrfToken
      ctx.cookies.set('csrfToken', newCsrfToken, { httpOnly: true, sameSite: 'strict' })
      ctx.body = {
        status: 'failed',
        message: 'csrf token mismatch',
        csrfToken: newCsrfToken,
      }
    }
  },
)

export { router as osm }
