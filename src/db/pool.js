import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
ssl: {
  rejectUnauthorized: false,
  require: true,
},
});
pool.connect()
  .then(() => console.log("✅ DB CONNECTED"))
  .catch((err) => console.error("❌ DB CONNECTION ERROR:", err));