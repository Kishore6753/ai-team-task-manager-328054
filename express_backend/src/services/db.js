const { Pool } = require('pg');

let pool = null;

// PUBLIC_INTERFACE
function getPool() {
  /** Get PostgreSQL connection pool using environment variables. */
  if (!pool) {
    pool = new Pool({
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      ssl: process.env.POSTGRES_SSL === 'true'
    });
  }
  return pool;
}

// PUBLIC_INTERFACE
async function query(sql, params) {
  /** Execute SQL query with optional parameters, returning result rows. */
  const pool = getPool();
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res;
  } finally {
    client.release();
  }
}

module.exports = { getPool, query };
