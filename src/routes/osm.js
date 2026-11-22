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
import { pointDistance } from '@mattduffy/calories'
import { ramerDouglasPeucker } from '@mattduffy/calories/rdp.js'
import { createAccessToken } from '../utils/accessTokens.js'
import { _log, _error } from '../utils/logging.js'
import { sql } from '../daos/impl/postgres/postgres-client.js'
import {
  addIpToSession,
  doTokensMatch,
  processFormData,
  // hasFlash,
} from './middlewares.js'

const osmLog = _log.extend('walk:osm')
const osmError = _error.extend('walk:osm')
/* eslint-disable-next-line no-unused-vars */
function sanitize(param) {
  // fill in with some effective input scubbing logic
  if (!param) osmError('missing param')
  return param
}

const GEOJSON_VERSION = 0.2

const geojsonTemplate = {
  _id: null,
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: null,
        version: 0.2,
        osm: {
          route_name: null,
          relation_id: null,
          relation_tags_type: null,
          relation_tags_route: null,
          relation_tags_source: null,
        },
        dateCopiedFromOsm: null,
        name: null,
        location: null,
        startPosition: {
          longitude: null,
          latitude: null,
          accuracy: null,
          altitude: null,
          heading: null,
        },
        endPosition: {
          longitude: null,
          latitude: null,
          accuracy: null,
          altitude: null,
          heading: null,
          timestamp: null,
          distance: null,
        },
        highestElevation: null,
        lowestElevation: null,
        changeInElevation: null,
        terrain: {
          value: null,
          text: null,
        },
      },
      geometry: {
        type: 'LineString',
        coordinates: [],
      },
    },
  ],
}

function calculateDistance(track) {
  osmLog('calculateDistance(track)')
  osmLog('track.length', track.length)
  if (track.length < 1) {
    osmLog('returning null')
    return null
  }
  if (track.length < 2) {
    osmLog('returning 0')
    return 0
  }
  let distance = 0
  track.map((c, i) => {
    // call pointDistance(p1, p2, u = 'metric')
    // p1 is track[i], p2 is track[i + 1]
    let next
    if (i <= track.length - 2) {
      next = pointDistance(
        { longitude: track[i][0], latitude: track[i][1] },
        { longitude: track[i + 1][0], latitude: track[i + 1][1] },
      )
    } else {
      next = 0
    }
    // osmLog(`i: ${i}, next: ${next}`)
    distance += next
    return 0
  })
  osmLog('computed distance:', distance)
  return distance
}

const EPSILON = 2.9
function convertOsmToGeojson(t) {
  const tmp = {
    geojson: structuredClone(geojsonTemplate),
    distance_meters: t.distance_meters,
  }
  tmp.geojson._id = new ObjectId()
  tmp.geojson.type = 'FeatureCollection'
  tmp.geojson.features[0].properties.version = GEOJSON_VERSION
  tmp.geojson.features[0].properties.osm.route_name = t.route_name
  tmp.geojson.features[0].properties.osm.relation_id = t.relation_id
  tmp.geojson.features[0].properties.osm.relation_tags = t.relation_tags
  tmp.geojson.features[0].properties.dateCopiedFromOsm = Date.now()
  tmp.geojson.features[0].properties.name = t.route_name ?? 'Unnamed trail'
  tmp.geojson.features[0].properties.location = undefined
  tmp.geojson.features[0].properties.highestElevation = undefined
  tmp.geojson.features[0].properties.lowestElevation = undefined
  tmp.geojson.features[0].properties.changeInElevation = undefined
  tmp.geojson.features[0].properties.startPosition = {
    latitude: t.sequenced_coordinates[0].lat,
    longitude: t.sequenced_coordinates[0].lon,
    accuracy: null,
  }
  const len = t.sequenced_coordinates.length
  tmp.geojson.features[0].properties.endPosition = {
    latitude: t.sequenced_coordinates[len - 2].lat,
    longitude: t.sequenced_coordinates[len - 2].lon,
    accuracy: null,
  }
  tmp.geojson.features[0].geometry.type = 'LineString'
  // osmLog('osm trail length:                         ', t.sequenced_coordinates.length)
  tmp.geojson.features[0].geometry.coordinates = ramerDouglasPeucker(t.sequenced_coordinates
    .map((c) => [c.lon, c.lat, null, null, null, null]), EPSILON)
  // osmLog(
  //   'after ramer-douglas-peucker (epsilon: %d)',
  //   EPSILON,
  //   tmp.geojson.features[0].geometry.coordinates.length,
  // )
  const calculatedDistance = calculateDistance(
    tmp.geojson.features[0].geometry.coordinates,
  )
  // osmLog('calculated distance', calculatedDistance)
  tmp.geojson.features[0].properties.distance = calculatedDistance
  return tmp
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
        radiusMeters = n // value already in meters
        // radiusMeters = Number.parseInt(n * 1.609 * 1000, 10) // convert miles to meters
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
        newCsrfToken,
        osm: {
          meta: {
            generatedAt: new Date(),
            cached: false,
            pagination: {
              totalTrails: 0,
              offset: 0,
              limit: 0,
              totalPages: 0,
            },
          },
          trails: [],
        },
      }
      try {
        /* eslint-disable prefer-template */
        const trails = await sql`
          WITH nearby_ways AS (
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
              SELECT 
                  r.id AS relation_id,
                  r.tags->>'name' AS route_name,
                  r.tags AS relation_tags,
                  MIN(ST_Distance(
                      nw.way,
                      ST_Transform(ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326), 3857)
                  )) AS distance_meters
              FROM 
                  planet_osm_rels r --
              JOIN LATERAL unnest(planet_osm_member_ids(r.members, 'W')) AS way_id ON true
              JOIN nearby_ways nw ON nw.osm_id = way_id
              WHERE 
                  (
                    r.tags->>'route' = ${type}
                    OR r.tags->>'route' = 'foot'
                    OR r.tags->>'highway' = 'pedestrian' -- add tag check for highway=pedestrian
                    OR r.tags->>'highway' = 'path'       -- add tag check for highway=path
                    OR r.tags->>'highway' = 'footway'    -- add tag check for highway=footway
                  )
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
              -- Replaces node IDs with a sequential JSONB array of {lon, lat} coordinate objects
              (
                  SELECT jsonb_agg(
                      jsonb_build_object(
                          'lon', n.lon::double precision / 10000000.0,
                          'lat', n.lat::double precision / 10000000.0
                      )
                      ORDER BY m.ord, node_idx
                  )
                  FROM planet_osm_rels r2
                  CROSS JOIN LATERAL jsonb_array_elements(r2.members)
                    WITH ORDINALITY AS m(elem, ord)
                  JOIN planet_osm_ways w ON w.id = (elem->>'ref')::bigint
                  CROSS JOIN LATERAL unnest(w.nodes) WITH ORDINALITY AS n_idx(node_id, node_idx)
                  JOIN planet_osm_nodes n ON n.id = node_id
                  WHERE r2.id = p.relation_id AND elem->>'type' = 'W'
              ) AS sequenced_coordinates
          FROM 
              paginated p
          ORDER BY 
              p.distance_meters ASC;
        `
        /* eslint-enable prefer-template */
        osmLog(`found ${trails.length} hiking trails.`)
        // body.geojson = trails.map(convertOsmToGeojson)
        // body.osm.trails = trails
        body.osm.trails = trails.map(convertOsmToGeojson)
        if (trails.length < 1) {
          body.osm.meta.pagination.totalTrails = 0
          body.osm.meta.pagination.limit = limit
          body.osm.meta.pagination.offset = 0
          body.osm.meta.pagination.currentPage = 1
          body.osm.meta.pagination.totalPages = 0
        } else {
          body.osm.meta.pagination.totalTrails = trails[0].total_count
          body.osm.meta.pagination.limit = limit
          body.osm.meta.pagination.offset = ((page - 1) * 10)
          body.osm.meta.pagination.currentPage = page
          body.osm.meta.pagination.totalPages = Math.ceil(trails[0].total_count / limit)
          body.osm.meta.request_duration_milliseconds = Date.now() - ctx.startTime
        }
      } catch (e) {
        body = { status: 'query failed', csrfToken: newCsrfToken, msg: e.toString() }
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
