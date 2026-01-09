import { pool } from "../../config/db.js";
import { logInfo } from "../../utils/logger.js";
import { parseId } from "../projects/projects.service.js";

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

const assignUserToProject = async (user, projectIdValue, targetUserIdValue) => {
  ensureAdmin(user);
  const projectId = parseId(projectIdValue, "projectId");
  const targetUserId = parseId(targetUserIdValue, "userId");

  const projectResult = await pool.query(
    "SELECT id FROM projects WHERE id = $1",
    [projectId]
  );
  if (projectResult.rowCount === 0) {
    throw createError(404, "Project not found");
  }

  const userResult = await pool.query("SELECT id FROM users WHERE id = $1", [
    targetUserId,
  ]);
  if (userResult.rowCount === 0) {
    throw createError(404, "User not found");
  }

  const existing = await pool.query(
    "SELECT id FROM project_users WHERE project_id = $1 AND user_id = $2",
    [projectId, targetUserId]
  );
  if (existing.rowCount > 0) {
    throw createError(409, "User already assigned to project");
  }

  const result = await pool.query(
    `INSERT INTO project_users (project_id, user_id)
     VALUES ($1, $2)
     RETURNING id, project_id, user_id, created_at`,
    [projectId, targetUserId]
  );

  logInfo(`User ${targetUserId} assigned to project ${projectId}`);
  return result.rows[0];
};

const removeUserFromProject = async (
  user,
  projectIdValue,
  targetUserIdValue
) => {
  ensureAdmin(user);
  const projectId = parseId(projectIdValue, "projectId");
  const targetUserId = parseId(targetUserIdValue, "userId");

  const projectResult = await pool.query(
    "SELECT id FROM projects WHERE id = $1",
    [projectId]
  );
  if (projectResult.rowCount === 0) {
    throw createError(404, "Project not found");
  }

  const result = await pool.query(
    "DELETE FROM project_users WHERE project_id = $1 AND user_id = $2",
    [projectId, targetUserId]
  );

  if (result.rowCount === 0) {
    throw createError(404, "Project assignment not found");
  }

  logInfo(`User ${targetUserId} removed from project ${projectId}`);
};

const listProjectUsers = async (user, projectIdValue) => {
  ensureAdmin(user);
  const projectId = parseId(projectIdValue, "projectId");

  const projectResult = await pool.query(
    "SELECT id FROM projects WHERE id = $1",
    [projectId]
  );
  if (projectResult.rowCount === 0) {
    throw createError(404, "Project not found");
  }

  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.is_active, pu.created_at
     FROM project_users pu
     JOIN users u ON u.id = pu.user_id
     WHERE pu.project_id = $1
     ORDER BY pu.created_at DESC`,
    [projectId]
  );

  return result.rows;
};

export { assignUserToProject, removeUserFromProject, listProjectUsers };
