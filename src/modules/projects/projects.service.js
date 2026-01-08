import { pool } from "../../config/db.js";

const createError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const parseId = (value, name) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw createError(400, `${name} must be a positive integer`);
  }
  return id;
};

const getProjectRecord = async (projectId) => {
  const result = await pool.query(
    `SELECT p.id,
            p.name,
            p.owner_id,
            p.created_at,
            u.name AS owner_name,
            u.email AS owner_email
     FROM projects p
     JOIN users u ON u.id = p.owner_id
     WHERE p.id = $1`,
    [projectId]
  );

  if (result.rowCount === 0) {
    throw createError(404, "Project not found");
  }

  return result.rows[0];
};

const ensureProjectAccess = async (user, projectIdValue) => {
  const projectId = parseId(projectIdValue, "projectId");
  const project = await getProjectRecord(projectId);

  if (user.role === "ADMIN") {
    return project;
  }

  if (project.owner_id === user.id) {
    return project;
  }

  const access = await pool.query(
    "SELECT 1 FROM project_users WHERE project_id = $1 AND user_id = $2",
    [projectId, user.id]
  );

  if (access.rowCount === 0) {
    throw createError(403, "Forbidden");
  }

  return project;
};

const ensureOwnerOrAdmin = async (user, projectIdValue) => {
  const projectId = parseId(projectIdValue, "projectId");
  const project = await getProjectRecord(projectId);

  if (user.role === "ADMIN" || project.owner_id === user.id) {
    return project;
  }

  throw createError(403, "Forbidden");
};

const createProject = async (user, { name }) => {
  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (!trimmedName) {
    throw createError(400, "Project name is required");
  }

  const result = await pool.query(
    `WITH inserted AS (
       INSERT INTO projects (name, owner_id)
       VALUES ($1, $2)
       RETURNING id, name, owner_id, created_at
     )
     SELECT inserted.id,
            inserted.name,
            inserted.owner_id,
            inserted.created_at,
            u.name AS owner_name,
            u.email AS owner_email
     FROM inserted
     JOIN users u ON u.id = inserted.owner_id`,
    [trimmedName, user.id]
  );

  console.log(`Project created: ${result.rows[0].id}`);
  return result.rows[0];
};

const listProjects = async (user) => {
  if (user.role === "ADMIN") {
    const result = await pool.query(
      `SELECT p.id,
              p.name,
              p.owner_id,
              p.created_at,
              u.name AS owner_name,
              u.email AS owner_email
       FROM projects p
       JOIN users u ON u.id = p.owner_id
       ORDER BY p.created_at DESC`
    );
    return result.rows;
  }

  const result = await pool.query(
    `SELECT DISTINCT p.id,
            p.name,
            p.owner_id,
            p.created_at,
            u.name AS owner_name,
            u.email AS owner_email
     FROM projects p
     LEFT JOIN project_users pu ON p.id = pu.project_id
     JOIN users u ON u.id = p.owner_id
     WHERE p.owner_id = $1 OR pu.user_id = $1
     ORDER BY p.created_at DESC`,
    [user.id]
  );

  return result.rows;
};

const getProjectById = async (user, projectIdValue) => {
  return ensureProjectAccess(user, projectIdValue);
};

const deleteProject = async (user, projectIdValue) => {
  const project = await ensureOwnerOrAdmin(user, projectIdValue);

  const result = await pool.query("DELETE FROM projects WHERE id = $1", [
    project.id,
  ]);

  if (result.rowCount === 0) {
    throw createError(404, "Project not found");
  }

  console.log(`Project deleted: ${project.id}`);
  return project;
};

export {
  createProject,
  listProjects,
  getProjectById,
  deleteProject,
  ensureProjectAccess,
  parseId,
};
