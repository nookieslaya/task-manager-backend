import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/db.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw createError(500, "JWT secret not configured");
  }
  return secret;
};

const validateCredentials = (email, password) => {
  if (typeof email !== "string" || !emailRegex.test(email)) {
    throw createError(400, "Invalid email format");
  }

  if (typeof password !== "string" || password.length < 8) {
    throw createError(400, "Password must be at least 8 characters");
  }
};

const validateName = (name) => {
  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (trimmedName.length < 2) {
    throw createError(400, "Name is required");
  }
  return trimmedName;
};

const registerUser = async ({ name, email, password }) => {
  const displayName = validateName(name);
  validateCredentials(email, password);

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
    normalizedEmail,
  ]);

  if (existing.rowCount > 0) {
    throw createError(409, "Email already registered");
  }

  const saltRounds = Number(process.env.BCRYPT_ROUNDS) || 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const result = await pool.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, is_active, created_at`,
    [displayName, normalizedEmail, hashedPassword, "USER"]
  );

  console.log(`User registered: ${normalizedEmail}`);
  return result.rows[0];
};

const loginUser = async ({ email, password }) => {
  validateCredentials(email, password);

  const normalizedEmail = email.trim().toLowerCase();
  const result = await pool.query(
    "SELECT id, name, email, password, role, is_active FROM users WHERE email = $1",
    [normalizedEmail]
  );

  if (result.rowCount === 0) {
    throw createError(401, "Invalid credentials");
  }

  const user = result.rows[0];

  if (!user.is_active) {
    throw createError(403, "User is inactive");
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    throw createError(401, "Invalid credentials");
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
  );

  console.log(`User login: ${normalizedEmail}`);
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

const getUserById = async (id) => {
  const result = await pool.query(
    "SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1",
    [id]
  );

  if (result.rowCount === 0) {
    throw createError(404, "User not found");
  }

  return result.rows[0];
};

export { registerUser, loginUser, getUserById };
