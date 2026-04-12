// test-db.js
const { Pool } = require('pg');

// Set up your database connection string (ensure it's in .env or hardcode it here)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testDatabaseConnection() {
  try {
    const res = await pool.query('SELECT * FROM products LIMIT 5');
    console.log('Query result:', res.rows);  // Should print product data or an empty array
  } catch (error) {
    console.error('Error querying the database:', error.message);
  } finally {
    pool.end();  // Close the pool
  }
}

testDatabaseConnection();
