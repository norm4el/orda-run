import polyline from '@mapbox/polyline';
import { pool } from '.';

function buildLineStringWkt(polylineString: string) {
  const decodedPoints = polyline.decode(polylineString) as Array<[number, number]>;

  if (decodedPoints.length < 2) {
    throw new Error('Polyline must contain at least two points');
  }

  const coordinates = decodedPoints.map(([lat, lng]) => `${lng} ${lat}`);
  return `LINESTRING(${coordinates.join(', ')})`;
}

export async function captureTerritory(userId: string, polylineString: string) {
  const lineStringWkt = buildLineStringWkt(polylineString);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
        WITH input_line AS (
          SELECT ST_GeomFromText($2, 4326) AS geom
        ),
        closed_lines AS (
          SELECT ST_AddPoint(geom, ST_StartPoint(geom)) AS geom
          FROM input_line
          WHERE geom IS NOT NULL AND ST_NumPoints(geom) >= 2
        ),
        nodes AS (
          SELECT ST_Node(ST_Collect(geom)) AS geom
          FROM closed_lines
        ),
        enclosed_polys AS (
          SELECT (ST_Dump(ST_Polygonize(geom))).geom AS geom
          FROM nodes
        ),
        new_zone AS (
          SELECT ST_Union(geom) AS geom
          FROM enclosed_polys
        ),
        locked_other_territories AS (
          SELECT t.id
          FROM territories t
          CROSS JOIN new_zone z
          WHERE t.owner_id <> $1::uuid
            AND z.geom IS NOT NULL
            AND ST_Intersects(t.polygon, z.geom)
          FOR UPDATE
        ),
        deleted_other_territories AS (
          DELETE FROM territories t
          USING locked_other_territories lt
          WHERE t.id = lt.id
          RETURNING t.owner_id, t.polygon
        ),
        split_other_territories AS (
          SELECT
            d.owner_id,
            dumped.geom
          FROM deleted_other_territories d
          CROSS JOIN new_zone z
          CROSS JOIN LATERAL ST_Dump(ST_Difference(d.polygon, z.geom)) AS dumped
        ),
        insert_reduced AS (
          INSERT INTO territories (owner_id, polygon, captured_at)
          SELECT owner_id, geom, NOW()
          FROM split_other_territories
          WHERE geom IS NOT NULL
            AND NOT ST_IsEmpty(geom)
            AND ST_Area(geom::geography) > 0
          RETURNING id
        ),
        locked_own_territories AS (
          SELECT t.id
          FROM territories t
          CROSS JOIN new_zone z
          WHERE t.owner_id = $1::uuid
            AND z.geom IS NOT NULL
            AND ST_Intersects(t.polygon, z.geom)
          FOR UPDATE
        ),
        deleted_own_territories AS (
          DELETE FROM territories t
          USING locked_own_territories lt
          WHERE t.id = lt.id
          RETURNING t.polygon
        ),
        merged_own_zone AS (
          SELECT ST_Union(
            COALESCE((SELECT geom FROM new_zone WHERE geom IS NOT NULL), ST_GeomFromText('GEOMETRYCOLLECTION EMPTY', 4326)),
            COALESCE((SELECT ST_Union(polygon) FROM deleted_own_territories), ST_GeomFromText('GEOMETRYCOLLECTION EMPTY', 4326))
          ) AS geom
        ),
        insert_new_zone AS (
          INSERT INTO territories (owner_id, polygon, captured_at)
          SELECT $1::uuid, (ST_Dump(geom)).geom::geometry(Polygon, 4326), NOW()
          FROM merged_own_zone
          WHERE geom IS NOT NULL AND NOT ST_IsEmpty(geom)
          RETURNING id
        )
        SELECT
          (SELECT COUNT(*)::int FROM insert_reduced) AS reduced_pieces,
          (SELECT COUNT(*)::int FROM insert_new_zone) AS new_territories;
      `,
      [userId, lineStringWkt],
    );

    await client.query('COMMIT');
    return result.rows[0] as { reduced_pieces: number; new_territories: number };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
