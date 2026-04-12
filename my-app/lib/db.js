import { Pool } from 'pg';

/** True when hostname is only reachable on your own machine (never from Vercel / serverless). */
export function databaseUrlPointsToLocalhost(url = process.env.DATABASE_URL) {
  if (!url || typeof url !== 'string') return false;
  try {
    const { hostname } = new URL(url);
    const h = hostname.toLowerCase();
    return h === 'localhost' || h === '127.0.0.1' || h === '::1';
  } catch {
    return false;
  }
}

/** Vercel build/runtime cannot reach a DB on localhost — use Neon, Supabase, Vercel Postgres, etc. */
export function isVercelUsingUnreachableDatabase() {
  return Boolean(process.env.VERCEL) && databaseUrlPointsToLocalhost();
}

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

    if (isVercelUsingUnreachableDatabase()) {
      throw new Error(
        'DATABASE_URL uses localhost, which is not reachable on Vercel. ' +
          'Create a hosted Postgres (e.g. Neon, Supabase, Vercel Postgres) and set DATABASE_URL in the Vercel project Environment Variables.'
      );
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
