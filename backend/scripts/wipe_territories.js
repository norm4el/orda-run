"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../src/db");
async function run() {
    try {
        console.log('Truncating territories table...');
        await db_1.pool.query('TRUNCATE TABLE territories CASCADE');
        console.log('Successfully wiped all territories!');
    }
    catch (error) {
        console.error('Error wiping territories:', error);
    }
    finally {
        process.exit(0);
    }
}
run();
