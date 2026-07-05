"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureTerritory = captureTerritory;
const polyline_1 = __importDefault(require("@mapbox/polyline"));
const _1 = require(".");
function buildLineStringWkt(polylineString) {
    const decodedPoints = polyline_1.default.decode(polylineString);
    if (decodedPoints.length < 2) {
        throw new Error('Polyline must contain at least two points');
    }
    const coordinates = decodedPoints.map(([lat, lng]) => `${lng} ${lat}`);
    return `LINESTRING(${coordinates.join(', ')})`;
}
async function captureTerritory(userId, polylineString) {
    const lineStringWkt = buildLineStringWkt(polylineString);
    const client = await _1.pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(`
        WITH input_line AS (
          SELECT ST_GeomFromText($2, 4326) AS geom
        ),
        new_zone AS (
          SELECT ST_Buffer(geom::geography, 30)::geometry AS geom
          FROM input_line
        ),
        locked_territories AS (
          SELECT t.id
          FROM territories t
          CROSS JOIN new_zone z
          WHERE t.owner_id <> $1::uuid
            AND ST_Intersects(t.polygon, z.geom)
          FOR UPDATE
        ),
        deleted_territories AS (
          DELETE FROM territories t
          USING locked_territories lt
          WHERE t.id = lt.id
          RETURNING t.owner_id, t.polygon
        ),
        split_territories AS (
          SELECT
            d.owner_id,
            dumped.geom
          FROM deleted_territories d
          CROSS JOIN new_zone z
          CROSS JOIN LATERAL ST_Dump(ST_Difference(d.polygon, z.geom)) AS dumped
        ),
        insert_reduced AS (
          INSERT INTO territories (owner_id, polygon, captured_at)
          SELECT owner_id, geom, NOW()
          FROM split_territories
          WHERE geom IS NOT NULL
            AND NOT ST_IsEmpty(geom)
            AND ST_Area(geom::geography) > 0
          RETURNING id
        ),
        insert_new_zone AS (
          INSERT INTO territories (owner_id, polygon, captured_at)
          SELECT $1::uuid, z.geom::geometry(Polygon, 4326), NOW()
          FROM new_zone z
          RETURNING id
        )
        SELECT
          (SELECT COUNT(*)::int FROM insert_reduced) AS reduced_pieces,
          (SELECT COUNT(*)::int FROM insert_new_zone) AS new_territories;
      `, [userId, lineStringWkt]);
        await client.query('COMMIT');
        return result.rows[0];
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
