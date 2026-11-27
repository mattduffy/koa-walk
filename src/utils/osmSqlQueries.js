/**
 * @summary SQL statements for openstreetmap queries.
 * @module @mattduffy/koa-stub
 * @author Matthew Duffy <mattduffy@gmail.com>
 * @description  SQL statements for openstreetmap query.
 * @file src/utils/osmSqlQueries.js
 */

import { sql } from '../daos/impl/postgres/postgres-client.js'

/**
 * Build the parameterized query to find trails near a point.  Returns a postgres.js
 * PendingQuery (not a string), so every ${} value is sent as a bound parameter.
 * The query is executed when the returned value is awaited.
 * @param {Object} o - Query parameters.
 * @return {PendingQuery} Lazy postgres.js query object.
 */
const findTrailsQuery = ({
  longitude,
  latitude,
  type,
  radiusMeters,
  page,
  PAGE_LIMIT,
}) => sql`WITH nearby_ways AS (
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
            LIMIT ${PAGE_LIMIT}
            OFFSET ( (${page} - 1) * ${PAGE_LIMIT} )
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
            p.distance_meters ASC;`

export {
  findTrailsQuery,
}
