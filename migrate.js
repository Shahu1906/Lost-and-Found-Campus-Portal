const fs = require('fs');
const path = require('path');
const { pool } = require('./src/config/db');

async function migrate() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'migrations', '001_initial_schema.sql'), 'utf-8');
    console.log('Running migrations on Supabase database...');
    await pool.query(sql);
    console.log('Migrations executed successfully. All tables created!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

migrate();
