import pg from "pg";
import { logError, logInfo } from "../utils/logger.js";

const { Pool } = pg;

const buildConnectionString = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  if (!host || !port || !database || !user || !password) {
    throw new Error(
      "DATABASE_URL is not set and DB_* variables are incomplete"
    );
  }

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
};

const connectionString = buildConnectionString();

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const initDb = async () => {
  try {
    const client = await pool.connect();
    logInfo("Database connection established");
    client.release();
  } catch (error) {
    logError("Database connection failed:", error);
  }
};

const closeDb = async () => {
  await pool.end();
};

export { pool, initDb, closeDb };
