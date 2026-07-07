const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/orda_run',
});

async function run() {
  const lineStringWkt = 'LINESTRING(0 0, 1 1, 2 0)'; // V shape
  const res = await pool.query(`
    WITH input_line AS (
      SELECT ST_GeomFromText($1, 4326) AS geom
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
    )
    SELECT ST_AsText(geom) as poly FROM new_zone
  `, [lineStringWkt]);
  console.log(res.rows);
  process.exit(0);
}

run();
