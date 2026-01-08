import {
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
} from "./tasks.service.js";

const create = async (req, res, next) => {
  try {
    const { title, description } = req.body ?? {};
    const task = await createTask(req.user, req.params.projectId, {
      title,
      description,
    });
    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const tasks = await listTasks(req.user, req.params.projectId);
    res.status(200).json({ tasks });
  } catch (error) {
    next(error);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body ?? {};
    const task = await updateTaskStatus(req.user, req.params.id, status);
    res.status(200).json({ task });
  } catch (error) {
    next(error);
  }
};

const addTime = async (req, res, next) => {
  try {
    const { minutes } = req.body ?? {};
    const result = await addTimeEntry(req.user, req.params.id, minutes);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const updateTime = async (req, res, next) => {
  try {
    const { minutes } = req.body ?? {};
    const result = await updateTimeEntry(req.user, req.params.entryId, minutes);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const updateDescription = async (req, res, next) => {
  try {
    const { description } = req.body ?? {};
    const task = await updateTaskDescription(req.user, req.params.id, description);
    res.status(200).json({ task });
  } catch (error) {
    next(error);
  }
};

const addItem = async (req, res, next) => {
  try {
    const { content } = req.body ?? {};
    const item = await addTaskItem(req.user, req.params.id, content);
    res.status(201).json({ item });
  } catch (error) {
    next(error);
  }
};

const updateItem = async (req, res, next) => {
  try {
    const { content, isDone } = req.body ?? {};
    const item = await updateTaskItem(req.user, req.params.itemId, {
      content,
      isDone,
    });
    res.status(200).json({ item });
  } catch (error) {
    next(error);
  }
};

const removeItem = async (req, res, next) => {
  try {
    await deleteTaskItem(req.user, req.params.itemId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await deleteTask(req.user, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export {
  create,
  list,
  updateStatus,
  updateDescription,
  addItem,
  updateItem,
  removeItem,
  addTime,
  updateTime,
  remove,
};
