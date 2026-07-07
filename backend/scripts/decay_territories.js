"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../src/db");
async function run() {
    try {
        console.log('Starting territory decay process...');
        // Decay: Shrink territories older than 7 days by 5 meters
        // We use ST_Buffer with a negative distance.
        // 5 meters is approx 0.000045 degrees.
        const result = await db_1.pool.query(`
      WITH decayed AS (
        SELECT id, ST_Buffer(polygon::geography, -5)::geometry AS new_polygon
        FROM territories
        WHERE captured_at < NOW() - INTERVAL '7 days'
      ),
      updated AS (
        UPDATE territories t
        SET polygon = d.new_polygon
        FROM decayed d
        WHERE t.id = d.id AND NOT ST_IsEmpty(d.new_polygon)
        RETURNING t.id
      ),
      deleted AS (
        DELETE FROM territories t
        USING decayed d
        WHERE t.id = d.id AND (ST_IsEmpty(d.new_polygon) OR d.new_polygon IS NULL)
        RETURNING t.id
      )
      SELECT 
        (SELECT COUNT(*) FROM updated) as updated_count,
        (SELECT COUNT(*) FROM deleted) as deleted_count
    `);
        console.log(`Decay complete. Updated: ${result.rows[0].updated_count}, Deleted: ${result.rows[0].deleted_count}`);
        process.exit(0);
    }
    catch (err) {
        console.error('Failed to decay territories:', err);
        process.exit(1);
    }
}
void run();
