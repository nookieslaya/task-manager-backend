import { pool } from "../../config/db.js";

const createError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const ensureAdmin = (user) => {
  if (user.role !== "ADMIN") {
    throw createError(403, "Forbidden");
  }
};

const listUsers = async (user) => {
  ensureAdmin(user);

  const result = await pool.query(
    `SELECT id, name, email, role, is_active, created_at
     FROM users
     ORDER BY created_at DESC`
  );

  return result.rows;
};

export { listUsers };
