import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;
const createPoolConfig = () => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    };
  }


};

export const pool = new Pool(createPoolConfig());




pool.on('connect', (client) => {
  console.log('✅ Database connected successfully!');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err.message);
  console.error(err.stack);
  process.exit(1); // Stop the server if DB is down
});
