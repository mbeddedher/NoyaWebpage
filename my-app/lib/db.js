import { Pool } from 'pg';

// Create a pool to manage connections
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper function to connect to the database and run queries
export const connectToDatabase = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    // Get a client from the pool
    const client = await pool.connect();
    
    // Verify the connection works
    await client.query('SELECT NOW()');
    
    return client;
  } catch (error) {
    console.error("Error connecting to the database:", error);
    throw error;
  }
};

// Function to query the database
export const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error("Error executing query:", error);
    throw error;
  } finally {
    client.release();
  }
};
