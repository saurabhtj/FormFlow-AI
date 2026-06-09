import { Pool } from 'pg';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL Connection Pool
export const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/storyforge',
});

// Redis Client
export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

export const connectDatabases = async () => {
  try {
    // Attempt connecting to Postgres (it might fail if no local DB is running, but we catch it)
    await db.connect();
    console.log('Connected to PostgreSQL Database');
  } catch (error) {
    console.error('Failed to connect to PostgreSQL. Please ensure DB is running or update DATABASE_URL.', error);
  }

  try {
    await redisClient.connect();
    console.log('Connected to Redis');
  } catch (error) {
    console.error('Failed to connect to Redis. Please ensure Redis is running.', error);
  }
};
