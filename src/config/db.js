import pg from "pg";
import { logError, logInfo } from "../utils/logger.js";

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === "production";

const buildConnectionString = () => {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const hasDbParts = host && port && database && user && password;

  if (!isProduction && hasDbParts) {
    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (hasDbParts) {
    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }

  throw new Error("DATABASE_URL is not set and DB_* variables are incomplete");
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
