import {
  createProject,
  listProjects,
  getProjectById,
  deleteProject,
} from "./projects.service.js";

const create = async (req, res, next) => {
  try {
    const { name } = req.body ?? {};
    const project = await createProject(req.user, { name });
    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const projects = await listProjects(req.user);
    res.status(200).json({ projects });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const project = await getProjectById(req.user, req.params.id);
    res.status(200).json({ project });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await deleteProject(req.user, req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export { create, list, getById, remove };
