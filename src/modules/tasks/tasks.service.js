import { pool } from "../../config/db.js";
import { ensureProjectAccess, parseId } from "../projects/projects.service.js";

const createError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const allowedStatuses = new Set(["TODO", "IN_PROGRESS", "DONE"]);

const parseNonNegativeInt = (value, name) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw createError(400, `${name} must be 0 or a positive number`);
  }
  return Math.round(number);
};

const parsePositiveInt = (value, name) => {
  const number = parseNonNegativeInt(value, name);
  if (number <= 0) {
    throw createError(400, `${name} must be greater than 0`);
  }
  return number;
};

const recalculateTaskTime = async (taskId) => {
  const sumResult = await pool.query(
    "SELECT COALESCE(SUM(minutes), 0) AS total FROM task_time_entries WHERE task_id = $1",
    [taskId]
  );
  const totalMinutes = Number(sumResult.rows[0].total);

  await pool.query(
    "UPDATE tasks SET time_spent_minutes = $1 WHERE id = $2",
    [totalMinutes, taskId]
  );

  return totalMinutes;
};

const createTask = async (
  user,
  projectIdValue,
  { title, description }
) => {
  const projectId = parseId(projectIdValue, "projectId");
  const trimmedTitle = typeof title === "string" ? title.trim() : "";

  if (!trimmedTitle) {
    throw createError(400, "Task title is required");
  }

  const trimmedDescription =
    typeof description === "string" ? description.trim() : "";

  await ensureProjectAccess(user, projectId);

  const result = await pool.query(
    `INSERT INTO tasks (title, description, project_id, time_spent_minutes, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, description, status, time_spent_minutes, project_id, created_at, created_by`,
    [trimmedTitle, trimmedDescription || null, projectId, 0, user.id]
  );

  console.log(`Task created: ${result.rows[0].id}`);
  return result.rows[0];
};

const listTasks = async (user, projectIdValue) => {
  const projectId = parseId(projectIdValue, "projectId");
  await ensureProjectAccess(user, projectId);

  const result = await pool.query(
    `SELECT t.id,
            t.title,
            t.description,
            t.status,
            t.time_spent_minutes,
            t.project_id,
            t.created_by,
            t.created_at,
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', ti.id,
                    'content', ti.content,
                    'is_done', ti.is_done,
                    'created_at', ti.created_at
                  )
                  ORDER BY ti.created_at DESC
                )
                FROM task_items ti
                WHERE ti.task_id = t.id
              ),
              '[]'::json
            ) AS items,
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', te.id,
                    'minutes', te.minutes,
                    'created_at', te.created_at,
                    'updated_at', te.updated_at,
                    'user_id', te.user_id,
                    'user_name', u.name,
                    'user_email', u.email
                  )
                  ORDER BY te.created_at DESC
                )
                FROM task_time_entries te
                JOIN users u ON u.id = te.user_id
                WHERE te.task_id = t.id
              ),
              '[]'::json
            ) AS time_entries
     FROM tasks t
     WHERE t.project_id = $1
     ORDER BY t.created_at DESC`,
    [projectId]
  );

  return result.rows;
};

const updateTaskStatus = async (user, taskIdValue, status) => {
  const taskId = parseId(taskIdValue, "taskId");

  if (typeof status !== "string" || !allowedStatuses.has(status)) {
    throw createError(400, "Invalid task status");
  }

  const taskResult = await pool.query(
    "SELECT id, project_id, created_by FROM tasks WHERE id = $1",
    [taskId]
  );

  if (taskResult.rowCount === 0) {
    throw createError(404, "Task not found");
  }

  const task = taskResult.rows[0];
  await ensureProjectAccess(user, task.project_id);

  const result = await pool.query(
    `UPDATE tasks
     SET status = $1
     WHERE id = $2
     RETURNING id, title, description, status, time_spent_minutes, project_id, created_at, created_by`,
    [status, taskId]
  );

  console.log(`Task updated: ${taskId}`);
  return result.rows[0];
};

const deleteTask = async (user, taskIdValue) => {
  const taskId = parseId(taskIdValue, "taskId");

  const taskResult = await pool.query(
    "SELECT id, project_id FROM tasks WHERE id = $1",
    [taskId]
  );

  if (taskResult.rowCount === 0) {
    throw createError(404, "Task not found");
  }

  const task = taskResult.rows[0];
  await ensureProjectAccess(user, task.project_id);

  if (user.role !== "ADMIN" && task.created_by !== user.id) {
    throw createError(403, "Forbidden");
  }

  const result = await pool.query("DELETE FROM tasks WHERE id = $1", [taskId]);

  if (result.rowCount === 0) {
    throw createError(404, "Task not found");
  }

  console.log(`Task deleted: ${taskId}`);
};

const addTimeEntry = async (user, taskIdValue, minutes) => {
  const taskId = parseId(taskIdValue, "taskId");
  const entryMinutes = parsePositiveInt(minutes, "minutes");

  const taskResult = await pool.query(
    "SELECT id, project_id FROM tasks WHERE id = $1",
    [taskId]
  );

  if (taskResult.rowCount === 0) {
    throw createError(404, "Task not found");
  }

  const task = taskResult.rows[0];
  await ensureProjectAccess(user, task.project_id);

  const result = await pool.query(
    `WITH inserted AS (
       INSERT INTO task_time_entries (task_id, user_id, minutes)
       VALUES ($1, $2, $3)
       RETURNING id, task_id, user_id, minutes, created_at, updated_at
     )
     SELECT inserted.id,
            inserted.task_id,
            inserted.user_id,
            inserted.minutes,
            inserted.created_at,
            inserted.updated_at,
            u.name AS user_name,
            u.email AS user_email
     FROM inserted
     JOIN users u ON u.id = inserted.user_id`,
    [taskId, user.id, entryMinutes]
  );

  const totalMinutes = await recalculateTaskTime(taskId);

  console.log(`Task time entry added: ${result.rows[0].id}`);
  return { entry: result.rows[0], totalMinutes };
};

const updateTimeEntry = async (user, entryIdValue, minutes) => {
  if (user.role !== "ADMIN") {
    throw createError(403, "Forbidden");
  }

  const entryId = parseId(entryIdValue, "entryId");
  const entryMinutes = parsePositiveInt(minutes, "minutes");

  const entryResult = await pool.query(
    `SELECT te.id, te.task_id, t.project_id
     FROM task_time_entries te
     JOIN tasks t ON t.id = te.task_id
     WHERE te.id = $1`,
    [entryId]
  );

  if (entryResult.rowCount === 0) {
    throw createError(404, "Time entry not found");
  }

  const entry = entryResult.rows[0];
  await ensureProjectAccess(user, entry.project_id);

  const result = await pool.query(
    `UPDATE task_time_entries
     SET minutes = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, task_id, user_id, minutes, created_at, updated_at`,
    [entryMinutes, entryId]
  );

  const userResult = await pool.query(
    "SELECT name, email FROM users WHERE id = $1",
    [result.rows[0].user_id]
  );

  const totalMinutes = await recalculateTaskTime(entry.task_id);

  console.log(`Task time entry updated: ${entryId}`);
  return {
    entry: {
      ...result.rows[0],
      user_name: userResult.rows[0]?.name || null,
      user_email: userResult.rows[0]?.email || null,
    },
    totalMinutes,
  };
};

const updateTaskDescription = async (user, taskIdValue, description) => {
  const taskId = parseId(taskIdValue, "taskId");
  const trimmedDescription =
    typeof description === "string" ? description.trim() : "";

  const taskResult = await pool.query(
    "SELECT id, project_id, created_by FROM tasks WHERE id = $1",
    [taskId]
  );

  if (taskResult.rowCount === 0) {
    throw createError(404, "Task not found");
  }

  const task = taskResult.rows[0];
  await ensureProjectAccess(user, task.project_id);

  if (user.role !== "ADMIN" && task.created_by !== user.id) {
    throw createError(403, "Forbidden");
  }

  const result = await pool.query(
    `UPDATE tasks
     SET description = $1
     WHERE id = $2
     RETURNING id, title, description, status, time_spent_minutes, project_id, created_at, created_by`,
    [trimmedDescription || null, taskId]
  );

  console.log(`Task description updated: ${taskId}`);
  return result.rows[0];
};

const addTaskItem = async (user, taskIdValue, content) => {
  const taskId = parseId(taskIdValue, "taskId");
  const trimmedContent = typeof content === "string" ? content.trim() : "";

  if (!trimmedContent) {
    throw createError(400, "Item content is required");
  }

  const taskResult = await pool.query(
    "SELECT id, project_id FROM tasks WHERE id = $1",
    [taskId]
  );

  if (taskResult.rowCount === 0) {
    throw createError(404, "Task not found");
  }

  const task = taskResult.rows[0];
  await ensureProjectAccess(user, task.project_id);

  const result = await pool.query(
    `INSERT INTO task_items (task_id, content)
     VALUES ($1, $2)
     RETURNING id, content, is_done, created_at`,
    [taskId, trimmedContent]
  );

  console.log(`Task item added: ${result.rows[0].id}`);
  return result.rows[0];
};

const updateTaskItem = async (user, itemIdValue, { content, isDone }) => {
  const itemId = parseId(itemIdValue, "itemId");
  const trimmedContent = typeof content === "string" ? content.trim() : null;

  const itemResult = await pool.query(
    `SELECT ti.id, ti.task_id, ti.content, ti.is_done, t.project_id
     FROM task_items ti
     JOIN tasks t ON t.id = ti.task_id
     WHERE ti.id = $1`,
    [itemId]
  );

  if (itemResult.rowCount === 0) {
    throw createError(404, "Item not found");
  }

  const item = itemResult.rows[0];
  await ensureProjectAccess(user, item.project_id);

  const nextContent = trimmedContent || item.content;
  const nextDone =
    typeof isDone === "boolean" ? isDone : item.is_done;

  const result = await pool.query(
    `UPDATE task_items
     SET content = $1, is_done = $2
     WHERE id = $3
     RETURNING id, content, is_done, created_at`,
    [nextContent, nextDone, itemId]
  );

  console.log(`Task item updated: ${itemId}`);
  return result.rows[0];
};

const deleteTaskItem = async (user, itemIdValue) => {
  const itemId = parseId(itemIdValue, "itemId");

  const itemResult = await pool.query(
    `SELECT ti.id, t.project_id
     FROM task_items ti
     JOIN tasks t ON t.id = ti.task_id
     WHERE ti.id = $1`,
    [itemId]
  );

  if (itemResult.rowCount === 0) {
    throw createError(404, "Item not found");
  }

  const item = itemResult.rows[0];
  await ensureProjectAccess(user, item.project_id);

  await pool.query("DELETE FROM task_items WHERE id = $1", [itemId]);
  console.log(`Task item deleted: ${itemId}`);
};

export {
  createTask,
  listTasks,
  updateTaskStatus,
  deleteTask,
  updateTaskDescription,
  addTaskItem,
  updateTaskItem,
  deleteTaskItem,
  addTimeEntry,
  updateTimeEntry,
};
