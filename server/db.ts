import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Node.js environment
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure pool with better defaults and error handling
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Maximum number of connections
  maxUses: 10000, // Maximum number of times a connection can be reused
  idleTimeoutMillis: 120000, // Connection timeout when idle (2 minutes)
  connectionTimeoutMillis: 10000, // Connection timeout when connecting (10 seconds)
  allowExitOnIdle: false // Don't allow the pool to exit while idle
});

// Add error handler for unexpected errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Add connection testing
pool.on('connect', async (client) => {
  try {
    await client.query('SELECT 1');
    console.log('Database connection established successfully');
  } catch (err) {
    console.error('Error testing database connection:', err);
    client.release(true); // Release with error
  }
});

// Export configured drizzle instance
export const db = drizzle(pool, { schema });

// Export a function to test the connection
export async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (err) {
    console.error('Database connection test failed:', err);
    return false;
  }
}